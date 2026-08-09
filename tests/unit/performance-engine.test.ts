import { describe, expect, it } from "vitest";

import {
  buildPortfolioValueSeries,
  calculateAnnualReturns,
  calculateMonthlyReturns,
  calculatePeriodReturns,
  calculateReturns,
  type EngineTransaction,
  type HistoricalPricePoint,
  type PortfolioValuePoint,
} from "@/lib/financial/performance-engine";
import type { FxRatePoint } from "@/lib/financial/fx-engine";

function point(partial: Partial<PortfolioValuePoint> & Pick<PortfolioValuePoint, "date" | "portfolioValueBase">): PortfolioValuePoint {
  return { cashBase: 0, externalCashFlowBase: 0, ...partial };
}

// ---------------------------------------------------------------------------
// Golden test (spec §39) — hand-verified TWR
// ---------------------------------------------------------------------------
describe("calculateReturns — golden test (spec §39)", () => {
  const series: PortfolioValuePoint[] = [
    point({ date: "2026-01-01", portfolioValueBase: 100_000 }),
    point({ date: "2026-01-02", portfolioValueBase: 105_000 }),
    point({ date: "2026-01-03", portfolioValueBase: 126_000, externalCashFlowBase: 20_000 }),
  ];

  const returns = calculateReturns(series);

  it("has no return for the first (baseline) point", () => {
    expect(returns[0].dailyReturn).toBeNull();
    expect(returns[0].cumulativeReturn).toBeNull();
  });

  it("computes the day-2 subperiod return with no cash flow as a simple return", () => {
    expect(returns[1].dailyReturn).toBeCloseTo(0.05, 10);
    expect(returns[1].cumulativeReturn).toBeCloseTo(0.05, 10);
  });

  it("neutralizes the day-3 deposit out of the subperiod return", () => {
    // (126,000 - 20,000) / 105,000 - 1
    expect(returns[2].dailyReturn).toBeCloseTo(106_000 / 105_000 - 1, 10);
  });

  it("geometrically links to a 6% TWR despite the mid-period deposit", () => {
    expect(returns[2].cumulativeReturn).toBeCloseTo(0.06, 10);
  });

  it("is NOT (currentValue - investedCapital) / investedCapital (spec §5 banned formula)", () => {
    // That formula would give (126,000 - 120,000) / 120,000 = 5%, not 6%.
    const bannedFormula = (126_000 - 120_000) / 120_000;
    expect(returns[2].cumulativeReturn).not.toBeCloseTo(bannedFormula, 4);
  });
});

// ---------------------------------------------------------------------------
// calculateReturns — cash flow handling
// ---------------------------------------------------------------------------
describe("calculateReturns — cash flow scenarios", () => {
  it("portfolio with no cash flows: TWR equals simple return", () => {
    const returns = calculateReturns([
      point({ date: "2026-01-01", portfolioValueBase: 100_000 }),
      point({ date: "2026-02-01", portfolioValueBase: 110_000 }),
    ]);
    expect(returns[1].cumulativeReturn).toBeCloseTo(0.10, 10);
  });

  it("withdrawal mid-period is neutralized the same way as a deposit", () => {
    // Value drops from 100k to 70k, but 30k of that was withdrawn — true
    // investment return should be flat (0%), not -30%.
    const returns = calculateReturns([
      point({ date: "2026-01-01", portfolioValueBase: 100_000 }),
      point({ date: "2026-01-02", portfolioValueBase: 70_000, externalCashFlowBase: -30_000 }),
    ]);
    expect(returns[1].dailyReturn).toBeCloseTo(0, 10);
  });

  it("multiple deposits across a series compound correctly", () => {
    // Day 2: 100,000 * 1.01 = 101,000, then +20,000 deposit = 121,000.
    // Day 3: 121,000 * 1.01 = 122,210, then +30,000 deposit = 152,210.
    const returns = calculateReturns([
      point({ date: "2026-01-01", portfolioValueBase: 100_000 }),
      point({ date: "2026-01-02", portfolioValueBase: 121_000, externalCashFlowBase: 20_000 }),
      point({ date: "2026-01-03", portfolioValueBase: 152_210, externalCashFlowBase: 30_000 }),
    ]);
    expect(returns[1].dailyReturn).toBeCloseTo(0.01, 6);
    expect(returns[2].dailyReturn).toBeCloseTo(0.01, 6);
    // (1.01 * 1.01) - 1
    expect(returns[2].cumulativeReturn).toBeCloseTo(1.01 * 1.01 - 1, 6);
  });

  it("never computes a return when the prior value is missing/zero", () => {
    const returns = calculateReturns([
      point({ date: "2026-01-01", portfolioValueBase: 0 }),
      point({ date: "2026-01-02", portfolioValueBase: 1000, externalCashFlowBase: 1000 }),
    ]);
    expect(returns[1].dailyReturn).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// buildPortfolioValueSeries — integration with transactions/prices/FX
// ---------------------------------------------------------------------------
function tx(partial: Partial<EngineTransaction> & Pick<EngineTransaction, "id" | "type" | "date">): EngineTransaction {
  return { securityId: null, quantity: null, price: null, currency: "USD", fees: 0, tax: 0, ...partial };
}

describe("buildPortfolioValueSeries", () => {
  it("includes a BUY from the day it happens, valued at the executed price", () => {
    const { series } = buildPortfolioValueSeries(
      [
        tx({ id: "1", type: "DEPOSIT", date: "2026-01-01", price: 10_000 }),
        tx({ id: "2", type: "BUY", date: "2026-01-02", securityId: "X", quantity: 10, price: 100 }),
      ],
      [],
      [],
      "USD",
    );
    const buyDay = series.find((p) => p.date === "2026-01-02")!;
    expect(buyDay.portfolioValueBase).toBeCloseTo(10_000, 6); // 1000 in stock + 9000 cash
  });

  it("revalues holdings using each date's historical price, not today's price", () => {
    const prices: HistoricalPricePoint[] = [
      { securityId: "X", date: "2026-01-05", price: 150, currency: "USD" },
    ];
    const { series } = buildPortfolioValueSeries(
      [
        tx({ id: "1", type: "DEPOSIT", date: "2026-01-01", price: 10_000 }),
        tx({ id: "2", type: "BUY", date: "2026-01-02", securityId: "X", quantity: 10, price: 100 }),
      ],
      prices,
      [],
      "USD",
    );
    const day5 = series.find((p) => p.date === "2026-01-05")!;
    expect(day5.portfolioValueBase).toBeCloseTo(9000 + 10 * 150, 6);
  });

  it("SELL reduces the position and is cash-neutral for total portfolio value", () => {
    const { series } = buildPortfolioValueSeries(
      [
        tx({ id: "1", type: "DEPOSIT", date: "2026-01-01", price: 10_000 }),
        tx({ id: "2", type: "BUY", date: "2026-01-02", securityId: "X", quantity: 10, price: 100 }),
        tx({ id: "3", type: "SELL", date: "2026-01-03", securityId: "X", quantity: 4, price: 100 }),
      ],
      [],
      [],
      "USD",
    );
    const sellDay = series.find((p) => p.date === "2026-01-03")!;
    // Still 10,000 total (bought and sold at the same price, no fees).
    expect(sellDay.portfolioValueBase).toBeCloseTo(10_000, 6);
  });

  it("DIVIDEND increases portfolio value without counting as external cash flow", () => {
    const { series } = buildPortfolioValueSeries(
      [
        tx({ id: "1", type: "DEPOSIT", date: "2026-01-01", price: 10_000 }),
        tx({ id: "2", type: "DIVIDEND", date: "2026-01-05", securityId: "X", price: 50 }),
      ],
      [],
      [],
      "USD",
    );
    const divDay = series.find((p) => p.date === "2026-01-05")!;
    expect(divDay.portfolioValueBase).toBeCloseTo(10_050, 6);
    expect(divDay.externalCashFlowBase).toBe(0);
  });

  it("FEE reduces portfolio value as a real cost", () => {
    const { series } = buildPortfolioValueSeries(
      [
        tx({ id: "1", type: "DEPOSIT", date: "2026-01-01", price: 10_000 }),
        tx({ id: "2", type: "FEE", date: "2026-01-05", price: 25 }),
      ],
      [],
      [],
      "USD",
    );
    const feeDay = series.find((p) => p.date === "2026-01-05")!;
    expect(feeDay.portfolioValueBase).toBeCloseTo(9975, 6);
  });

  it("converts a foreign-currency holding to base currency using the historical FX rate", () => {
    const fxRates: FxRatePoint[] = [
      { baseCurrency: "USD", quoteCurrency: "ILS", date: "2026-01-01", rate: 3.7 },
    ];
    const { series } = buildPortfolioValueSeries(
      [
        tx({ id: "1", type: "DEPOSIT", date: "2026-01-01", price: 10_000, currency: "ILS" }),
        tx({ id: "2", type: "BUY", date: "2026-01-01", securityId: "X", quantity: 10, price: 100, currency: "USD" }),
      ],
      [],
      fxRates,
      "ILS",
    );
    const day = series.find((p) => p.date === "2026-01-01")!;
    // 10,000 ILS deposited, minus 10*100 USD converted to ILS to fund the buy,
    // plus the holding's own value (same conversion) — nets back to the deposit.
    expect(day.portfolioValueBase).toBeCloseTo(10_000, 6);
    expect(day.cashBase).toBeCloseTo(10_000 - 10 * 100 * 3.7, 6);
  });

  it("flags a warning instead of fabricating a value when FX is missing", () => {
    const { series, warnings } = buildPortfolioValueSeries(
      [tx({ id: "1", type: "BUY", date: "2026-01-01", securityId: "X", quantity: 10, price: 100, currency: "EUR" })],
      [],
      [],
      "USD",
    );
    expect(series[0].portfolioValueBase).toBe(0); // holding excluded, not zero-priced
    expect(warnings.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Period / monthly / annual returns
// ---------------------------------------------------------------------------
describe("calculatePeriodReturns", () => {
  it("returns null for periods the series doesn't reach back far enough for", () => {
    const returns = calculateReturns([
      point({ date: "2026-06-01", portfolioValueBase: 100_000 }),
      point({ date: "2026-06-02", portfolioValueBase: 101_000 }),
    ]);
    const periods = calculatePeriodReturns(returns, "2026-06-02");
    expect(periods["1Y"]).toBeNull();
  });

  it("computes 1D as the most recent daily return", () => {
    const returns = calculateReturns([
      point({ date: "2026-06-01", portfolioValueBase: 100_000 }),
      point({ date: "2026-06-02", portfolioValueBase: 101_000 }),
    ]);
    const periods = calculatePeriodReturns(returns, "2026-06-02");
    expect(periods["1D"]).toBeCloseTo(0.01, 6);
  });

  it("SINCE_INCEPTION equals the last cumulative return", () => {
    const returns = calculateReturns([
      point({ date: "2026-01-01", portfolioValueBase: 100_000 }),
      point({ date: "2026-06-02", portfolioValueBase: 120_000 }),
    ]);
    const periods = calculatePeriodReturns(returns, "2026-06-02");
    expect(periods.SINCE_INCEPTION).toBeCloseTo(0.2, 6);
  });
});

describe("calculateMonthlyReturns", () => {
  it("computes one return per calendar month with data", () => {
    const returns = calculateReturns([
      point({ date: "2026-01-31", portfolioValueBase: 100_000 }),
      point({ date: "2026-02-28", portfolioValueBase: 110_000 }),
      point({ date: "2026-03-31", portfolioValueBase: 121_000 }),
    ]);
    const monthly = calculateMonthlyReturns(returns);
    expect(monthly).toHaveLength(3);
    expect(monthly[0].return).toBeNull(); // no prior point to compare January against
    expect(monthly[1].return).toBeCloseTo(0.10, 6);
    expect(monthly[2].return).toBeCloseTo(0.10, 6);
  });
});

describe("calculateAnnualReturns", () => {
  it("computes one return per calendar year with data", () => {
    const returns = calculateReturns([
      point({ date: "2025-12-31", portfolioValueBase: 100_000 }),
      point({ date: "2026-12-31", portfolioValueBase: 115_000 }),
    ]);
    const annual = calculateAnnualReturns(returns);
    expect(annual[1].year).toBe(2026);
    expect(annual[1].return).toBeCloseTo(0.15, 6);
  });
});
