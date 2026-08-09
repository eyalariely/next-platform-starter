import "server-only";

import { cache } from "react";

import { db } from "@/lib/db";
import {
  calculateHoldings,
  type CurrentPrice,
  type EngineTransaction,
  type HoldingResult,
} from "@/lib/financial/portfolio-engine";
import type { FxRatePoint } from "@/lib/financial/fx-engine";
import { getCurrentPrice, getExchangeRates } from "@/services/market-data.service";
import { getPortfolioForUser, PortfolioNotFoundError } from "@/services/portfolio.service";

// Configurable "how old can a price be before we flag it Stale" threshold
// (spec §28). Default of 4 days comfortably covers a weekend without
// falsely flagging Friday's close as stale on a Monday morning.
const STALE_PRICE_DAYS = Number(process.env.MARKET_DATA_STALE_DAYS ?? 4);

function isPriceDateStale(isoDate: string): boolean {
  const ageMs = Date.now() - new Date(`${isoDate}T00:00:00Z`).getTime();
  return ageMs > STALE_PRICE_DAYS * 24 * 60 * 60 * 1000;
}

export interface HoldingWithSecurity extends HoldingResult {
  security: {
    id: string;
    ticker: string;
    name: string;
    exchange: string;
    currency: string;
    sector: string | null;
    securityType: string;
  } | null;
}

export interface PortfolioSummaryWithSecurities {
  portfolio: { id: string; name: string; baseCurrency: string };
  baseCurrency: string;
  portfolioValueBase: number;
  cashBase: number;
  investedCapitalBase: number;
  realizedPnLBase: number;
  unrealizedPnLBase: number;
  totalPnLBase: number;
  holdings: HoldingWithSecurity[];
  warnings: string[];
  stalePriceSecurityIds: string[];
}

/**
 * The stage-2 data pipeline (spec §16): Transactions → Security Master →
 * Market Prices → FX Rates → Holdings Engine → Portfolio Summary.
 *
 * Wrapped in React's `cache()` so, within a single request/render pass,
 * loading the same portfolio's summary twice (e.g. from a layout and a
 * page) hits the DB/provider once — no financial computation happens more
 * than once per request (spec §17). This is a request-scoped cache, not a
 * cross-request one; market-data.service.ts's DB-backed TTL cache is what
 * avoids repeat *provider* calls across requests.
 */
export const getPortfolioSummary = cache(
  async (userId: string, portfolioId: string): Promise<PortfolioSummaryWithSecurities> => {
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

    const securityById = new Map(
      transactions
        .filter((tx) => tx.security)
        .map((tx) => [tx.securityId as string, tx.security!]),
    );

    const priceResults = await Promise.all(
      [...securityById.values()].map(async (security) => {
        const cached = await getCurrentPrice(security.id, security.ticker);
        return { security, cached };
      }),
    );

    const currentPrices: CurrentPrice[] = priceResults
      .filter((r) => r.cached !== null)
      .map((r) => ({
        securityId: r.security.id,
        price: r.cached!.price,
        currency: r.cached!.currency,
      }));

    const stalePriceSecurityIds = priceResults
      .filter((r) => r.cached && (r.cached.stale || isPriceDateStale(r.cached.date)))
      .map((r) => r.security.id);

    const currencies = new Set<string>([portfolio.baseCurrency]);
    for (const tx of transactions) currencies.add(tx.currency);
    for (const security of securityById.values()) currencies.add(security.currency);
    currencies.delete(portfolio.baseCurrency);

    const earliestDate =
      transactions.length > 0 ? transactions[0].date : new Date();
    const today = new Date();

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

    const summary = calculateHoldings({
      transactions: engineTransactions,
      currentPrices,
      fxRates,
      baseCurrency: portfolio.baseCurrency,
    });

    const holdings: HoldingWithSecurity[] = summary.holdings.map((holding) => {
      const security = securityById.get(holding.securityId) ?? null;
      return {
        ...holding,
        security: security
          ? {
              id: security.id,
              ticker: security.ticker,
              name: security.name,
              exchange: security.exchange,
              currency: security.currency,
              sector: security.sector,
              securityType: security.securityType,
            }
          : null,
      };
    });

    return {
      portfolio: { id: portfolio.id, name: portfolio.name, baseCurrency: portfolio.baseCurrency },
      baseCurrency: summary.baseCurrency,
      portfolioValueBase: summary.portfolioValueBase,
      cashBase: summary.cashBase,
      investedCapitalBase: summary.investedCapitalBase,
      realizedPnLBase: summary.realizedPnLBase,
      unrealizedPnLBase: summary.unrealizedPnLBase,
      totalPnLBase: summary.totalPnLBase,
      holdings,
      warnings: summary.warnings,
      stalePriceSecurityIds,
    };
  },
);
