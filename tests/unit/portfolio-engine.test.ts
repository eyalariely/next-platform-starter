import { describe, expect, it } from "vitest";

import {
  calculateHoldings,
  type EngineTransaction,
} from "@/lib/financial/portfolio-engine";
import type { FxRatePoint } from "@/lib/financial/fx-engine";

function tx(partial: Partial<EngineTransaction> & Pick<EngineTransaction, "id" | "type" | "date">): EngineTransaction {
  return {
    securityId: null,
    quantity: null,
    price: null,
    currency: "USD",
    fees: 0,
    tax: 0,
    ...partial,
  };
}

describe("calculateHoldings — single security, single currency, full lifecycle", () => {
  // Hand-calculated golden scenario (see stage-2 spec §10/§11):
  //  1. DEPOSIT 2000
  //  2. BUY   10 @ 100, fee 5   -> avgCost 100.5, cash -1005
  //  3. BUY    5 @ 110, fee 2   -> avgCost (1005+552)/15 = 103.8, cash -552
  //  4. SELL   5 @ 115, fee 1   -> proceeds 574, cost removed 519, realized +55, cash +574
  //  5. DIVIDEND 20              -> cash +20, no effect on position
  //  6. FEE 3                    -> cash -3
  //  7. WITHDRAWAL 200           -> cash -200
  // Running cash: 2000-1005-552+574+20-3-200 = 834
  // Remaining qty 10 @ avgCost 103.8; current price 108 -> MV 1080,
  // cost basis 1038, unrealized +42, realized +55, total +97.
  const transactions: EngineTransaction[] = [
    tx({ id: "1", type: "DEPOSIT", date: "2026-01-01", price: 2000 }),
    tx({ id: "2", type: "BUY", date: "2026-01-02", securityId: "AAPL", quantity: 10, price: 100, fees: 5 }),
    tx({ id: "3", type: "BUY", date: "2026-01-03", securityId: "AAPL", quantity: 5, price: 110, fees: 2 }),
    tx({ id: "4", type: "SELL", date: "2026-01-10", securityId: "AAPL", quantity: 5, price: 115, fees: 1 }),
    tx({ id: "5", type: "DIVIDEND", date: "2026-01-15", securityId: "AAPL", price: 20 }),
    tx({ id: "6", type: "FEE", date: "2026-01-20", price: 3 }),
    tx({ id: "7", type: "WITHDRAWAL", date: "2026-01-25", price: 200 }),
  ];

  const result = calculateHoldings({
    transactions,
    currentPrices: [{ securityId: "AAPL", price: 108, currency: "USD" }],
    fxRates: [],
    baseCurrency: "USD",
  });

  it("computes the weighted average cost across multiple BUYs", () => {
    const holding = result.holdings.find((h) => h.securityId === "AAPL")!;
    expect(holding.quantity).toBe(10);
    expect(holding.averageCost).toBeCloseTo(103.8, 6);
  });

  it("leaves average cost unchanged after a partial SELL", () => {
    const holding = result.holdings.find((h) => h.securityId === "AAPL")!;
    expect(holding.averageCost).toBeCloseTo(103.8, 6);
  });

  it("computes realized P/L from the SELL (proceeds minus cost basis removed)", () => {
    const holding = result.holdings.find((h) => h.securityId === "AAPL")!;
    expect(holding.realizedPnLBase).toBeCloseTo(55, 6);
  });

  it("computes unrealized P/L from the current market price", () => {
    const holding = result.holdings.find((h) => h.securityId === "AAPL")!;
    expect(holding.marketValue).toBeCloseTo(1080, 6);
    expect(holding.unrealizedPnLBase).toBeCloseTo(42, 6);
    expect(holding.totalPnLBase).toBeCloseTo(97, 6);
  });

  it("applies DEPOSIT, BUY, SELL, DIVIDEND, FEE, and WITHDRAWAL to cash correctly", () => {
    expect(result.cashBase).toBeCloseTo(834, 6);
  });

  it("computes portfolio value as holdings value plus cash", () => {
    expect(result.portfolioValueBase).toBeCloseTo(1080 + 834, 6);
  });

  it("rolls realized + unrealized P/L into totalPnLBase at the portfolio level", () => {
    expect(result.totalPnLBase).toBeCloseTo(55 + 42, 6);
  });
});

describe("calculateHoldings — BUY variants", () => {
  it("a single BUY sets quantity and average cost directly", () => {
    const result = calculateHoldings({
      transactions: [tx({ id: "1", type: "BUY", date: "2026-01-01", securityId: "X", quantity: 4, price: 50 })],
      currentPrices: [],
      fxRates: [],
      baseCurrency: "USD",
    });
    const holding = result.holdings[0];
    expect(holding.quantity).toBe(4);
    expect(holding.averageCost).toBe(50);
  });

  it("a FULL SELL zeroes quantity and excludes the position from portfolio value", () => {
    const result = calculateHoldings({
      transactions: [
        tx({ id: "1", type: "BUY", date: "2026-01-01", securityId: "X", quantity: 4, price: 50 }),
        tx({ id: "2", type: "SELL", date: "2026-01-05", securityId: "X", quantity: 4, price: 60 }),
      ],
      currentPrices: [{ securityId: "X", price: 70, currency: "USD" }],
      fxRates: [],
      baseCurrency: "USD",
    });
    const holding = result.holdings[0];
    expect(holding.quantity).toBe(0);
    expect(holding.realizedPnLBase).toBeCloseTo(40, 6); // (4*60) - (4*50)
    expect(holding.marketValue).toBeNull();
    expect(result.portfolioValueBase).toBeCloseTo(result.cashBase, 6);
  });

  it("caps a SELL that exceeds current holdings instead of going negative", () => {
    const result = calculateHoldings({
      transactions: [
        tx({ id: "1", type: "BUY", date: "2026-01-01", securityId: "X", quantity: 5, price: 10 }),
        tx({ id: "2", type: "SELL", date: "2026-01-05", securityId: "X", quantity: 10, price: 12 }),
      ],
      currentPrices: [],
      fxRates: [],
      baseCurrency: "USD",
    });
    const holding = result.holdings[0];
    expect(holding.quantity).toBe(0);
    expect(result.warnings.some((w) => w.includes("עולה על הכמות"))).toBe(true);
  });
});

describe("calculateHoldings — cash-only transaction types", () => {
  it("DEPOSIT increases cash", () => {
    const result = calculateHoldings({
      transactions: [tx({ id: "1", type: "DEPOSIT", date: "2026-01-01", price: 500 })],
      currentPrices: [],
      fxRates: [],
      baseCurrency: "USD",
    });
    expect(result.cashBase).toBe(500);
  });

  it("WITHDRAWAL decreases cash", () => {
    const result = calculateHoldings({
      transactions: [
        tx({ id: "1", type: "DEPOSIT", date: "2026-01-01", price: 500 }),
        tx({ id: "2", type: "WITHDRAWAL", date: "2026-01-02", price: 200 }),
      ],
      currentPrices: [],
      fxRates: [],
      baseCurrency: "USD",
    });
    expect(result.cashBase).toBe(300);
  });

  it("DIVIDEND increases cash without affecting quantity or cost basis", () => {
    const result = calculateHoldings({
      transactions: [tx({ id: "1", type: "DIVIDEND", date: "2026-01-01", securityId: "X", price: 15 })],
      currentPrices: [],
      fxRates: [],
      baseCurrency: "USD",
    });
    expect(result.cashBase).toBe(15);
    // The security shows up (dividend history is tied to it) but with no
    // position, since only BUY/SELL affect quantity/cost basis.
    expect(result.holdings[0].quantity).toBe(0);
    expect(result.holdings[0].realizedPnLBase).toBe(0);
  });

  it("FEE decreases cash", () => {
    const result = calculateHoldings({
      transactions: [
        tx({ id: "1", type: "DEPOSIT", date: "2026-01-01", price: 100 }),
        tx({ id: "2", type: "FEE", date: "2026-01-02", price: 12 }),
      ],
      currentPrices: [],
      fxRates: [],
      baseCurrency: "USD",
    });
    expect(result.cashBase).toBe(88);
  });
});

describe("calculateHoldings — multi-currency", () => {
  const fxRates: FxRatePoint[] = [
    { baseCurrency: "USD", quoteCurrency: "ILS", date: "2026-01-01", rate: 3.7 },
  ];

  it("converts a foreign-currency position into the portfolio base currency", () => {
    const result = calculateHoldings({
      transactions: [
        tx({ id: "1", type: "DEPOSIT", date: "2026-01-01", price: 5000, currency: "ILS" }),
        tx({ id: "2", type: "BUY", date: "2026-01-01", securityId: "AAPL", quantity: 10, price: 100, currency: "USD" }),
      ],
      currentPrices: [{ securityId: "AAPL", price: 110, currency: "USD" }],
      fxRates,
      baseCurrency: "ILS",
    });

    const holding = result.holdings[0];
    expect(holding.averageCost).toBeCloseTo(100, 6); // native (USD)
    expect(holding.costCurrency).toBe("USD");
    expect(holding.marketValue).toBeCloseTo(1100, 6); // native (USD)
    expect(holding.marketValueBase).toBeCloseTo(1100 * 3.7, 6); // ILS
    expect(result.cashBase).toBeCloseTo(5000 - 1000 * 3.7, 6);
    expect(result.portfolioValueBase).toBeCloseTo(holding.marketValueBase! + result.cashBase, 6);
  });

  it("does not assume USD — a non-USD base currency with a non-USD security works the same way", () => {
    const eurToIls: FxRatePoint[] = [
      { baseCurrency: "EUR", quoteCurrency: "ILS", date: "2026-01-01", rate: 4.0 },
    ];
    const result = calculateHoldings({
      transactions: [
        tx({ id: "1", type: "BUY", date: "2026-01-01", securityId: "SAP", quantity: 2, price: 50, currency: "EUR" }),
      ],
      currentPrices: [{ securityId: "SAP", price: 55, currency: "EUR" }],
      fxRates: eurToIls,
      baseCurrency: "ILS",
    });
    const holding = result.holdings[0];
    expect(holding.marketValueBase).toBeCloseTo(2 * 55 * 4.0, 6);
  });
});

describe("calculateHoldings — missing data handling (spec §18)", () => {
  it("never crashes and never fabricates a market value when the price is missing", () => {
    const result = calculateHoldings({
      transactions: [tx({ id: "1", type: "BUY", date: "2026-01-01", securityId: "UNKNOWN", quantity: 3, price: 10 })],
      currentPrices: [],
      fxRates: [],
      baseCurrency: "USD",
    });
    const holding = result.holdings[0];
    expect(holding.quantity).toBe(3);
    expect(holding.marketValue).toBeNull();
    expect(holding.marketValueBase).toBeNull();
    expect(holding.weight).toBeNull();
    expect(holding.missingPriceData).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("never crashes and never fabricates a base-currency value when FX data is missing", () => {
    const result = calculateHoldings({
      transactions: [
        tx({ id: "1", type: "BUY", date: "2026-01-01", securityId: "SAP", quantity: 2, price: 50, currency: "EUR" }),
      ],
      currentPrices: [{ securityId: "SAP", price: 55, currency: "EUR" }],
      fxRates: [], // no EUR -> USD rate at all
      baseCurrency: "USD",
    });
    const holding = result.holdings[0];
    // Native-currency figures still compute fine without FX.
    expect(holding.quantity).toBe(2);
    expect(holding.averageCost).toBe(50);
    // But anything requiring conversion to base currency is null, not 0.
    expect(holding.marketValueBase).toBeNull();
    expect(holding.unrealizedPnLBase).toBeNull();
    expect(result.warnings.some((w) => w.includes("שער חליפין"))).toBe(true);
  });
});

describe("calculateHoldings — weight", () => {
  it("a single fully-cash-funded holding with no other cash gets weight 1", () => {
    const result = calculateHoldings({
      transactions: [
        tx({ id: "1", type: "DEPOSIT", date: "2026-01-01", price: 1000 }),
        tx({ id: "2", type: "BUY", date: "2026-01-01", securityId: "X", quantity: 10, price: 100 }),
      ],
      currentPrices: [{ securityId: "X", price: 100, currency: "USD" }],
      fxRates: [],
      baseCurrency: "USD",
    });
    expect(result.cashBase).toBeCloseTo(0, 6);
    expect(result.holdings[0].weight).toBeCloseTo(1, 6);
  });
});
