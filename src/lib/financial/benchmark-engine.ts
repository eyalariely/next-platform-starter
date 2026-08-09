/**
 * Benchmark Engine (spec §17-§22) — pure, isolated from portfolioEngine
 * and performanceEngine. Deliberately reuses performanceEngine's
 * `calculateReturns`/`calculatePeriodReturns` for the actual TWR/period
 * math (a benchmark's daily return is just the cash-flow-free special
 * case of a portfolio's — same engine, not a parallel implementation, so
 * the two are guaranteed methodologically consistent).
 */

import {
  calculatePeriodReturns,
  calculateReturns,
  type DailyReturnPoint,
  type PeriodKey,
  type PortfolioValuePoint,
} from "@/lib/financial/performance-engine";
import { convertCurrency, getHistoricalFxRate, type FxRatePoint } from "@/lib/financial/fx-engine";

export interface BenchmarkPricePoint {
  date: string; // ISO date
  close: number;
}

export type BenchmarkCurrencyMode = "local" | "portfolioCurrency";

/**
 * Converts raw benchmark closes into a return series. `mode` decides the
 * currency treatment when the benchmark's own currency differs from the
 * portfolio's base currency (spec §20):
 *  - "local": the benchmark's return in its own currency (e.g. S&P 500 in
 *    USD) — how the index itself performed.
 *  - "portfolioCurrency": each day's close is converted to the portfolio
 *    base currency first, so the return also captures FX movement — the
 *    fair comparison against a portfolio whose value is measured in that
 *    base currency.
 * The caller must pick one explicitly; there is no silent default mixing
 * the two (spec §20: "אל תערבב תשואת S&P בדולר עם תיק בשקלים ללא החלטת
 * Conversion ברורה").
 */
export function calculateBenchmarkReturns(
  prices: readonly BenchmarkPricePoint[],
  benchmarkCurrency: string,
  mode: BenchmarkCurrencyMode,
  portfolioBaseCurrency: string,
  fxRates: readonly FxRatePoint[],
): { series: DailyReturnPoint[]; warnings: string[] } {
  const warnings: string[] = [];
  const sorted = [...prices].sort((a, b) => a.date.localeCompare(b.date));

  const valuePoints: PortfolioValuePoint[] = [];
  for (const p of sorted) {
    let value = p.close;
    if (mode === "portfolioCurrency" && benchmarkCurrency !== portfolioBaseCurrency) {
      const rate = getHistoricalFxRate(fxRates, benchmarkCurrency, portfolioBaseCurrency, p.date);
      if (rate === null) {
        warnings.push(`חסר שער חליפין (${benchmarkCurrency} → ${portfolioBaseCurrency}) בתאריך ${p.date}`);
        continue;
      }
      value = convertCurrency(p.close, rate);
    }
    valuePoints.push({ date: p.date, portfolioValueBase: value, cashBase: 0, externalCashFlowBase: 0 });
  }

  return { series: calculateReturns(valuePoints), warnings };
}

/** Index normalized to a common base of 100 at the series' first point (spec §19). */
export interface NormalizedIndexPoint {
  date: string;
  index: number;
}

export function normalizeToBase100(series: readonly DailyReturnPoint[]): NormalizedIndexPoint[] {
  return series.map((point) => ({
    date: point.date,
    index: 100 * (1 + (point.cumulativeReturn ?? 0)),
  }));
}

export interface PortfolioVsBenchmarkPoint {
  date: string;
  portfolioIndex: number | null;
  benchmarkIndex: number | null;
}

/**
 * Aligns a portfolio return series and a benchmark return series onto the
 * same base-100 index for charting (spec §16/§19/§22). Dates that exist
 * in one series but not the other still appear, with the missing side
 * `null` — never interpolated (spec §33 "אין interpolation מלאכותי").
 */
export function alignPortfolioAndBenchmark(
  portfolioReturns: readonly DailyReturnPoint[],
  benchmarkReturns: readonly DailyReturnPoint[],
): PortfolioVsBenchmarkPoint[] {
  const portfolioIndex = new Map(normalizeToBase100(portfolioReturns).map((p) => [p.date, p.index]));
  const benchmarkIndex = new Map(normalizeToBase100(benchmarkReturns).map((p) => [p.date, p.index]));

  const allDates = [...new Set([...portfolioIndex.keys(), ...benchmarkIndex.keys()])].sort();

  return allDates.map((date) => ({
    date,
    portfolioIndex: portfolioIndex.get(date) ?? null,
    benchmarkIndex: benchmarkIndex.get(date) ?? null,
  }));
}

export interface BenchmarkComparisonRow {
  period: PeriodKey;
  portfolioReturn: number | null;
  benchmarkReturn: number | null;
  /** portfolioReturn − benchmarkReturn; null if either side is null. */
  difference: number | null;
}

const COMPARISON_PERIODS: PeriodKey[] = ["1M", "3M", "YTD", "1Y", "SINCE_INCEPTION"];

/** Portfolio vs. benchmark return comparison across the standard periods (spec §21). */
export function comparePortfolioToBenchmark(
  portfolioReturns: readonly DailyReturnPoint[],
  benchmarkReturns: readonly DailyReturnPoint[],
  asOfDate: string,
): BenchmarkComparisonRow[] {
  const portfolioPeriods = calculatePeriodReturns(portfolioReturns, asOfDate);
  const benchmarkPeriods = calculatePeriodReturns(benchmarkReturns, asOfDate);

  return COMPARISON_PERIODS.map((period) => {
    const portfolioReturn = portfolioPeriods[period];
    const benchmarkReturn = benchmarkPeriods[period];
    return {
      period,
      portfolioReturn,
      benchmarkReturn,
      difference:
        portfolioReturn === null || benchmarkReturn === null ? null : portfolioReturn - benchmarkReturn,
    };
  });
}
