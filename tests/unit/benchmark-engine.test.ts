import { describe, expect, it } from "vitest";

import {
  alignPortfolioAndBenchmark,
  calculateBenchmarkReturns,
  comparePortfolioToBenchmark,
  normalizeToBase100,
  type BenchmarkPricePoint,
} from "@/lib/financial/benchmark-engine";
import { calculateReturns, type PortfolioValuePoint } from "@/lib/financial/performance-engine";
import type { FxRatePoint } from "@/lib/financial/fx-engine";

describe("calculateBenchmarkReturns — local mode", () => {
  it("computes a simple price return series with no cash-flow effects", () => {
    const prices: BenchmarkPricePoint[] = [
      { date: "2026-01-01", close: 100 },
      { date: "2026-01-02", close: 110 },
    ];
    const { series } = calculateBenchmarkReturns(prices, "USD", "local", "USD", []);
    expect(series[1].dailyReturn).toBeCloseTo(0.10, 6);
  });
});

describe("calculateBenchmarkReturns — currency modes (spec §20)", () => {
  const prices: BenchmarkPricePoint[] = [
    { date: "2026-01-01", close: 100 },
    { date: "2026-01-02", close: 100 }, // flat in local currency
  ];
  const fxRates: FxRatePoint[] = [
    { baseCurrency: "USD", quoteCurrency: "ILS", date: "2026-01-01", rate: 3.5 },
    { baseCurrency: "USD", quoteCurrency: "ILS", date: "2026-01-02", rate: 3.85 }, // USD strengthened 10%
  ];

  it("'local' mode ignores FX — a flat index stays flat", () => {
    const { series } = calculateBenchmarkReturns(prices, "USD", "local", "ILS", fxRates);
    expect(series[1].dailyReturn).toBeCloseTo(0, 6);
  });

  it("'portfolioCurrency' mode folds FX movement into the return", () => {
    const { series } = calculateBenchmarkReturns(prices, "USD", "portfolioCurrency", "ILS", fxRates);
    expect(series[1].dailyReturn).toBeCloseTo(0.10, 6);
  });

  it("never mixes the two silently — the two modes give different answers for the same data", () => {
    const local = calculateBenchmarkReturns(prices, "USD", "local", "ILS", fxRates);
    const adjusted = calculateBenchmarkReturns(prices, "USD", "portfolioCurrency", "ILS", fxRates);
    expect(local.series[1].dailyReturn).not.toBeCloseTo(adjusted.series[1].dailyReturn!, 4);
  });
});

describe("normalizeToBase100", () => {
  it("starts every series at index 100 and compounds from there", () => {
    const points: PortfolioValuePoint[] = [
      { date: "2026-01-01", portfolioValueBase: 100, cashBase: 0, externalCashFlowBase: 0 },
      { date: "2026-01-02", portfolioValueBase: 110, cashBase: 0, externalCashFlowBase: 0 },
    ];
    const returns = calculateReturns(points);
    const index = normalizeToBase100(returns);
    expect(index[0].index).toBe(100);
    expect(index[1].index).toBeCloseTo(110, 6);
  });
});

describe("alignPortfolioAndBenchmark", () => {
  it("keeps dates present in only one series, with null on the missing side", () => {
    const portfolio = calculateReturns([
      { date: "2026-01-01", portfolioValueBase: 100, cashBase: 0, externalCashFlowBase: 0 },
      { date: "2026-01-03", portfolioValueBase: 105, cashBase: 0, externalCashFlowBase: 0 },
    ]);
    const benchmark = calculateReturns([
      { date: "2026-01-01", portfolioValueBase: 100, cashBase: 0, externalCashFlowBase: 0 },
      { date: "2026-01-02", portfolioValueBase: 101, cashBase: 0, externalCashFlowBase: 0 },
    ]);
    const aligned = alignPortfolioAndBenchmark(portfolio, benchmark);
    const jan2 = aligned.find((p) => p.date === "2026-01-02")!;
    expect(jan2.portfolioIndex).toBeNull();
    expect(jan2.benchmarkIndex).not.toBeNull();
  });
});

describe("comparePortfolioToBenchmark", () => {
  it("computes the difference per period, null-safe when data is missing", () => {
    const portfolio = calculateReturns([
      { date: "2026-01-01", portfolioValueBase: 100, cashBase: 0, externalCashFlowBase: 0 },
      { date: "2026-01-02", portfolioValueBase: 112, cashBase: 0, externalCashFlowBase: 0 },
    ]);
    const benchmark = calculateReturns([
      { date: "2026-01-01", portfolioValueBase: 100, cashBase: 0, externalCashFlowBase: 0 },
      { date: "2026-01-02", portfolioValueBase: 105, cashBase: 0, externalCashFlowBase: 0 },
    ]);
    const rows = comparePortfolioToBenchmark(portfolio, benchmark, "2026-01-02");
    const sinceInception = rows.find((r) => r.period === "SINCE_INCEPTION")!;
    expect(sinceInception.portfolioReturn).toBeCloseTo(0.12, 6);
    expect(sinceInception.benchmarkReturn).toBeCloseTo(0.05, 6);
    expect(sinceInception.difference).toBeCloseTo(0.07, 6);

    const oneYear = rows.find((r) => r.period === "1Y")!;
    expect(oneYear.difference).toBeNull();
  });
});
