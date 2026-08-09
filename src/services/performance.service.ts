import "server-only";

import { cache } from "react";

import { db } from "@/lib/db";
import {
  buildPortfolioValueSeries,
  calculateAnnualReturns,
  calculateMonthlyReturns,
  calculatePeriodReturns,
  calculateReturns,
  type AnnualReturn,
  type DailyReturnPoint,
  type EngineTransaction,
  type HistoricalPricePoint,
  type MonthlyReturn,
  type PeriodKey,
} from "@/lib/financial/performance-engine";
import { calculatePerformanceBySecurity, type SecurityPerformanceRow } from "@/lib/financial/performance-contribution";
import type { FxRatePoint } from "@/lib/financial/fx-engine";
import { getHistoricalPrices, getExchangeRates } from "@/services/market-data.service";
import { getPortfolioForUser, PortfolioNotFoundError } from "@/services/portfolio.service";
import { getPortfolioSummary } from "@/services/holdings.service";

export interface PortfolioPerformance {
  series: DailyReturnPoint[];
  periodReturns: Record<PeriodKey, number | null>;
  monthlyReturns: MonthlyReturn[];
  annualReturns: AnnualReturn[];
  performanceBySecurity: (SecurityPerformanceRow & {
    ticker: string;
    name: string;
  })[];
  warnings: string[];
}

/**
 * The stage-3 performance pipeline: loads transactions + full historical
 * prices/FX (not just "current", unlike holdings.service), then runs the
 * pure performanceEngine. Request-memoized via React's `cache()` — the
 * same portfolio's performance is computed once per request even if
 * multiple dashboard sections ask for it (spec §33).
 */
export const getPortfolioPerformance = cache(
  async (userId: string, portfolioId: string, asOfDate?: string): Promise<PortfolioPerformance> => {
    const portfolio = await getPortfolioForUser(userId, portfolioId);
    if (!portfolio) throw new PortfolioNotFoundError();

    const transactions = await db.transaction.findMany({
      where: { portfolioId },
      include: { security: true },
      orderBy: { date: "asc" },
    });

    const engineTransactions: EngineTransaction[] = transactions.map((tx) => ({
      id: tx.id,
      securityId: tx.securityId,
      type: tx.transactionType,
      date: tx.date.toISOString().slice(0, 10),
      quantity: tx.quantity?.toNumber() ?? null,
      price: tx.price?.toNumber() ?? null,
      currency: tx.currency,
      fees: tx.fees.toNumber(),
      tax: tx.tax.toNumber(),
    }));

    if (engineTransactions.length === 0) {
      return {
        series: [],
        periodReturns: {
          "1D": null, "1W": null, "1M": null, "3M": null, YTD: null, "1Y": null, SINCE_INCEPTION: null,
        },
        monthlyReturns: [],
        annualReturns: [],
        performanceBySecurity: [],
        warnings: [],
      };
    }

    const securityById = new Map(
      transactions.filter((tx) => tx.security).map((tx) => [tx.securityId as string, tx.security!]),
    );

    const earliestDate = transactions[0].date;
    const today = new Date();

    const priceGroups = await Promise.all(
      [...securityById.values()].map(async (security) => {
        const points = await getHistoricalPrices(security.id, security.ticker, earliestDate, today);
        return points.map(
          (p): HistoricalPricePoint => ({
            securityId: security.id,
            date: p.date,
            price: p.price,
            currency: p.currency,
          }),
        );
      }),
    );
    const historicalPrices = priceGroups.flat();

    const currencies = new Set<string>();
    for (const tx of transactions) currencies.add(tx.currency);
    for (const security of securityById.values()) currencies.add(security.currency);
    currencies.delete(portfolio.baseCurrency);

    const fxRateGroups = await Promise.all(
      [...currencies].map(async (currency) => {
        const rates = await getExchangeRates(currency, portfolio.baseCurrency, earliestDate, today);
        return rates.map(
          (r): FxRatePoint => ({
            baseCurrency: currency,
            quoteCurrency: portfolio.baseCurrency,
            date: r.date,
            rate: r.rate,
          }),
        );
      }),
    );
    const fxRates = fxRateGroups.flat();

    const { series: valueSeries, warnings: seriesWarnings } = buildPortfolioValueSeries(
      engineTransactions,
      historicalPrices,
      fxRates,
      portfolio.baseCurrency,
    );
    const series = calculateReturns(valueSeries);
    const effectiveAsOf = asOfDate ?? today.toISOString().slice(0, 10);
    const periodReturns = calculatePeriodReturns(series, effectiveAsOf);
    const monthlyReturns = calculateMonthlyReturns(series);
    const annualReturns = calculateAnnualReturns(series);

    // Performance-by-security reuses the already-computed, already-tested
    // holdings summary (portfolioEngine) rather than recomputing cost
    // basis/P&L a second way.
    const summary = await getPortfolioSummary(userId, portfolioId);
    const contributionRows = calculatePerformanceBySecurity(
      summary.holdings.map((h) => ({
        securityId: h.securityId,
        weight: h.weight,
        investedCapitalBase: h.marketValueBase !== null && h.unrealizedPnLBase !== null
          ? h.marketValueBase - h.unrealizedPnLBase
          : null,
        totalPnLBase: h.totalPnLBase,
      })),
      summary.totalPnLBase,
    );
    const performanceBySecurity = contributionRows.map((row) => {
      const security = securityById.get(row.securityId);
      return {
        ...row,
        ticker: security?.ticker ?? row.securityId,
        name: security?.name ?? row.securityId,
      };
    });

    return {
      series,
      periodReturns,
      monthlyReturns,
      annualReturns,
      performanceBySecurity,
      warnings: seriesWarnings,
    };
  },
);
