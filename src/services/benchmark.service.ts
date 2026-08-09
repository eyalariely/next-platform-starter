import "server-only";

import { cache } from "react";

import { db } from "@/lib/db";
import {
  alignPortfolioAndBenchmark,
  calculateBenchmarkReturns,
  comparePortfolioToBenchmark,
  type BenchmarkComparisonRow,
  type BenchmarkCurrencyMode,
  type BenchmarkPricePoint,
  type PortfolioVsBenchmarkPoint,
} from "@/lib/financial/benchmark-engine";
import { getBenchmarkDefinition, DEFAULT_BENCHMARK_KEY } from "@/lib/financial/benchmark-config";
import type { FxRatePoint } from "@/lib/financial/fx-engine";
import { getBenchmarkHistoricalPrices, getExchangeRates } from "@/services/market-data.service";
import { getPortfolioForUser, PortfolioNotFoundError } from "@/services/portfolio.service";
import { getPortfolioPerformance } from "@/services/performance.service";

export class UnknownBenchmarkError extends Error {
  constructor(key: string) {
    super(`Benchmark לא מוכר: "${key}"`);
    this.name = "UnknownBenchmarkError";
  }
}

async function ensureBenchmarkRow(key: string) {
  const definition = getBenchmarkDefinition(key);
  if (!definition) throw new UnknownBenchmarkError(key);

  const existing = await db.benchmark.findUnique({ where: { symbol: definition.dataSymbol } });
  if (existing) return { row: existing, definition };

  const created = await db.benchmark.create({
    data: { symbol: definition.dataSymbol, name: definition.name, currency: definition.currency },
  });
  return { row: created, definition };
}

export interface PortfolioVsBenchmarkResult {
  benchmarkKey: string;
  benchmarkName: string;
  mode: BenchmarkCurrencyMode;
  aligned: PortfolioVsBenchmarkPoint[];
  comparison: BenchmarkComparisonRow[];
  warnings: string[];
}

/**
 * Portfolio-vs-benchmark comparison (spec §17-22), request-memoized. Mode
 * defaults to "portfolioCurrency" (spec §20 requires *a* consistent
 * documented default — see benchmark-engine.ts for what each mode means).
 */
export const getPortfolioVsBenchmark = cache(
  async (
    userId: string,
    portfolioId: string,
    benchmarkKey: string = DEFAULT_BENCHMARK_KEY,
    mode: BenchmarkCurrencyMode = "portfolioCurrency",
    asOfDate?: string,
  ): Promise<PortfolioVsBenchmarkResult> => {
    const portfolio = await getPortfolioForUser(userId, portfolioId);
    if (!portfolio) throw new PortfolioNotFoundError();

    const { row: benchmarkRow, definition } = await ensureBenchmarkRow(benchmarkKey);
    const portfolioPerformance = await getPortfolioPerformance(userId, portfolioId, asOfDate);

    const from =
      portfolioPerformance.series.length > 0
        ? new Date(`${portfolioPerformance.series[0].date}T00:00:00Z`)
        : new Date();
    const to = new Date();

    const cachedPrices = await getBenchmarkHistoricalPrices(benchmarkRow.id, definition.dataSymbol, from, to);
    const prices: BenchmarkPricePoint[] = cachedPrices.map((p) => ({ date: p.date, close: p.close }));

    let fxRates: FxRatePoint[] = [];
    if (mode === "portfolioCurrency" && definition.currency !== portfolio.baseCurrency) {
      const rates = await getExchangeRates(definition.currency, portfolio.baseCurrency, from, to);
      fxRates = rates.map((r) => ({
        baseCurrency: definition.currency,
        quoteCurrency: portfolio.baseCurrency,
        date: r.date,
        rate: r.rate,
      }));
    }

    const { series: benchmarkSeries, warnings } = calculateBenchmarkReturns(
      prices,
      definition.currency,
      mode,
      portfolio.baseCurrency,
      fxRates,
    );

    const aligned = alignPortfolioAndBenchmark(portfolioPerformance.series, benchmarkSeries);
    const comparison = comparePortfolioToBenchmark(
      portfolioPerformance.series,
      benchmarkSeries,
      asOfDate ?? to.toISOString().slice(0, 10),
    );

    return {
      benchmarkKey,
      benchmarkName: definition.name,
      mode,
      aligned,
      comparison,
      warnings: [...portfolioPerformance.warnings, ...warnings],
    };
  },
);
