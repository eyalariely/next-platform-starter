import "server-only";

import { cache } from "react";

import { db } from "@/lib/db";
import {
  calculatePeriodReturns,
  calculateReturns,
  type DailyReturnPoint,
  type PeriodKey,
} from "@/lib/financial/performance-engine";
import { getHistoricalPrices, getCurrentPrice, type CachedPrice } from "@/services/market-data.service";
import { getPortfolioSummary, type HoldingWithSecurity } from "@/services/holdings.service";
import { calculatePerformanceBySecurity } from "@/lib/financial/performance-contribution";

export interface SecurityAnalysis {
  security: {
    id: string;
    ticker: string;
    name: string;
    exchange: string;
    currency: string;
    securityType: string;
    sector: string | null;
    industry: string | null;
    country: string | null;
    isin: string | null;
  };
  currentPrice: CachedPrice | null;
  dailyChangePct: number | null;
  priceSeries: { date: string; price: number }[];
  periodReturns: Record<PeriodKey, number | null>;
  sinceFirstPurchaseReturn: number | null;
  /** null when the user has no position in this security in the active portfolio. */
  position: HoldingWithSecurity | null;
  contributionToTotalPnL: number | null;
  transactions: {
    id: string;
    date: Date;
    type: string;
    quantity: number | null;
    price: number | null;
    currency: string;
    fees: number;
    tax: number;
    notes: string | null;
  }[];
}

/**
 * Full security analysis (spec §42): reuses holdings.service for the
 * position/P&L (already-tested engine output, not recomputed a second
 * way) and performanceEngine for the price-only return series.
 */
export const getSecurityAnalysis = cache(
  async (userId: string, portfolioId: string | null, ticker: string): Promise<SecurityAnalysis | null> => {
    const security = await db.security.findFirst({ where: { ticker: ticker.trim().toUpperCase() } });
    if (!security) return null;

    const to = new Date();
    const from = new Date(to);
    from.setUTCFullYear(from.getUTCFullYear() - 5); // enough history for 1Y/3Y-scale periods

    const [currentPrice, historicalPrices] = await Promise.all([
      getCurrentPrice(security.id, security.ticker),
      getHistoricalPrices(security.id, security.ticker, from, to),
    ]);

    const sortedPrices = [...historicalPrices].sort((a, b) => a.date.localeCompare(b.date));
    const priceSeries = sortedPrices.map((p) => ({ date: p.date, price: p.price }));

    const dailyChangePct =
      sortedPrices.length >= 2
        ? sortedPrices[sortedPrices.length - 1].price / sortedPrices[sortedPrices.length - 2].price - 1
        : null;

    // A security's own return series is just its price series fed through
    // the same TWR machinery with no cash flows — see benchmark-engine.ts
    // for the identical pattern.
    const priceReturns: DailyReturnPoint[] = calculateReturns(
      sortedPrices.map((p) => ({
        date: p.date,
        portfolioValueBase: p.price,
        cashBase: 0,
        externalCashFlowBase: 0,
      })),
    );
    const periodReturns = calculatePeriodReturns(priceReturns, to.toISOString().slice(0, 10));

    let position: HoldingWithSecurity | null = null;
    let contributionToTotalPnL: number | null = null;
    let sinceFirstPurchaseReturn: number | null = null;

    if (portfolioId) {
      const summary = await getPortfolioSummary(userId, portfolioId);
      position = summary.holdings.find((h) => h.securityId === security.id) ?? null;

      if (position) {
        const contributionRows = calculatePerformanceBySecurity(
          summary.holdings.map((h) => ({
            securityId: h.securityId,
            weight: h.weight,
            investedCapitalBase:
              h.marketValueBase !== null && h.unrealizedPnLBase !== null
                ? h.marketValueBase - h.unrealizedPnLBase
                : null,
            totalPnLBase: h.totalPnLBase,
          })),
          summary.totalPnLBase,
        );
        contributionToTotalPnL =
          contributionRows.find((r) => r.securityId === security.id)?.contributionToTotalPnL ?? null;
      }

      const firstBuy = await db.transaction.findFirst({
        where: { portfolioId, securityId: security.id, transactionType: "BUY" },
        orderBy: { date: "asc" },
      });
      if (firstBuy) {
        const firstBuyDate = firstBuy.date.toISOString().slice(0, 10);
        const sincePurchase = calculateReturns(
          sortedPrices
            .filter((p) => p.date >= firstBuyDate)
            .map((p) => ({ date: p.date, portfolioValueBase: p.price, cashBase: 0, externalCashFlowBase: 0 })),
        );
        sinceFirstPurchaseReturn = sincePurchase.at(-1)?.cumulativeReturn ?? null;
      }
    }

    const transactions = portfolioId
      ? await db.transaction.findMany({
          where: { portfolioId, securityId: security.id },
          orderBy: { date: "desc" },
        })
      : [];

    return {
      security,
      currentPrice,
      dailyChangePct,
      priceSeries,
      periodReturns,
      sinceFirstPurchaseReturn,
      position,
      contributionToTotalPnL,
      transactions: transactions.map((tx) => ({
        id: tx.id,
        date: tx.date,
        type: tx.transactionType,
        quantity: tx.quantity?.toNumber() ?? null,
        price: tx.price?.toNumber() ?? null,
        currency: tx.currency,
        fees: tx.fees.toNumber(),
        tax: tx.tax.toNumber(),
        notes: tx.notes,
      })),
    };
  },
);
