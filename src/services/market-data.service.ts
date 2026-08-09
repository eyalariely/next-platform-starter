import "server-only";

import { db } from "@/lib/db";
import { getMarketDataProvider } from "@/lib/market/provider";
import { MarketDataError } from "@/lib/market/types";

const QUOTE_TTL_SECONDS = Number(process.env.MARKET_DATA_QUOTE_TTL_SECONDS ?? 900);

export interface CachedPrice {
  date: string; // ISO date
  price: number;
  currency: string;
  /** True when this is a cached value returned despite a live refresh
   *  failing (spec §18 — degrade gracefully, don't blank the screen). */
  stale: boolean;
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Current price for a security, backed by the `market_prices` cache with
 * a TTL (spec §7) so we don't call the provider on every request. Falls
 * back to the last known cached price (marked `stale`) if a live refresh
 * fails, and returns `null` — never a fabricated number — if nothing is
 * cached and the provider call also fails (spec §18: "Missing Price").
 */
export async function getCurrentPrice(
  securityId: string,
  ticker: string,
): Promise<CachedPrice | null> {
  const latest = await db.marketPrice.findFirst({
    where: { securityId },
    orderBy: { date: "desc" },
  });

  const isFresh =
    latest && Date.now() - latest.updatedAt.getTime() < QUOTE_TTL_SECONDS * 1000;

  if (isFresh) {
    return {
      date: toIsoDate(latest.date),
      price: latest.close.toNumber(),
      currency: latest.currency,
      stale: false,
    };
  }

  try {
    const quote = await getMarketDataProvider().getQuote(ticker);
    if (!quote) {
      return latest ? toCachedPrice(latest, true) : null;
    }

    const currency = quote.currency || latest?.currency;
    if (!currency) {
      // Some providers (e.g. GLOBAL_QUOTE) don't return currency; without
      // one we cannot safely cache/convert this price.
      return latest ? toCachedPrice(latest, true) : null;
    }

    const saved = await db.marketPrice.upsert({
      where: { securityId_date: { securityId, date: quote.asOf } },
      update: { close: quote.price, adjustedClose: quote.price, currency },
      create: {
        securityId,
        date: quote.asOf,
        close: quote.price,
        adjustedClose: quote.price,
        currency,
      },
    });

    return toCachedPrice(saved, false);
  } catch (error) {
    // Rate limit / network / provider errors degrade to the last known
    // cached price rather than surfacing a raw error to the UI.
    if (error instanceof MarketDataError && latest) {
      return toCachedPrice(latest, true);
    }
    if (latest) return toCachedPrice(latest, true);
    return null;
  }
}

function toCachedPrice(
  row: { date: Date; close: { toNumber(): number }; currency: string },
  stale: boolean,
): CachedPrice {
  return { date: toIsoDate(row.date), price: row.close.toNumber(), currency: row.currency, stale };
}

/**
 * Historical daily prices for a security within [from, to], backed by the
 * `market_prices` cache. Only calls the provider when the cached range
 * doesn't already cover what was requested (spec §7: "אל תקרא API מחדש
 * אם הנתון כבר קיים ורלוונטי").
 */
export async function getHistoricalPrices(
  securityId: string,
  ticker: string,
  from: Date,
  to: Date,
): Promise<CachedPrice[]> {
  const cached = await db.marketPrice.findMany({
    where: { securityId, date: { gte: from, lte: to } },
    orderBy: { date: "asc" },
  });

  const coversRange =
    cached.length > 0 &&
    cached[0].date.getTime() <= from.getTime() + ONE_DAY_MS &&
    cached[cached.length - 1].date.getTime() >= to.getTime() - ONE_DAY_MS;

  if (coversRange) {
    return cached.map((row) => toCachedPrice(row, false));
  }

  try {
    const points = await getMarketDataProvider().getHistoricalPrices(ticker, from, to);
    if (points.length === 0) {
      return cached.map((row) => toCachedPrice(row, false));
    }

    await Promise.all(
      points.map((point) =>
        db.marketPrice.upsert({
          where: { securityId_date: { securityId, date: new Date(`${point.date}T00:00:00Z`) } },
          update: {
            open: point.open,
            high: point.high,
            low: point.low,
            close: point.close,
            adjustedClose: point.adjustedClose ?? point.close,
            volume: point.volume ? BigInt(Math.round(point.volume)) : null,
            currency: point.currency,
          },
          create: {
            securityId,
            date: new Date(`${point.date}T00:00:00Z`),
            open: point.open,
            high: point.high,
            low: point.low,
            close: point.close,
            adjustedClose: point.adjustedClose ?? point.close,
            volume: point.volume ? BigInt(Math.round(point.volume)) : null,
            currency: point.currency,
          },
        }),
      ),
    );

    const refreshed = await db.marketPrice.findMany({
      where: { securityId, date: { gte: from, lte: to } },
      orderBy: { date: "asc" },
    });
    return refreshed.map((row) => toCachedPrice(row, false));
  } catch {
    // Provider unavailable — serve whatever's cached, even if partial.
    return cached.map((row) => toCachedPrice(row, false));
  }
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export interface CachedRate {
  date: string;
  rate: number;
  stale: boolean;
}

/**
 * Historical FX rates for a currency pair, backed by the `exchange_rates`
 * cache, same freshness strategy as getHistoricalPrices.
 */
export async function getExchangeRates(
  base: string,
  quote: string,
  from: Date,
  to: Date,
): Promise<CachedRate[]> {
  if (base === quote) {
    return []; // fx-engine short-circuits same-currency; nothing to cache.
  }

  const cached = await db.exchangeRate.findMany({
    where: { baseCurrency: base, quoteCurrency: quote, date: { gte: from, lte: to } },
    orderBy: { date: "asc" },
  });

  const coversRange =
    cached.length > 0 &&
    cached[0].date.getTime() <= from.getTime() + ONE_DAY_MS &&
    cached[cached.length - 1].date.getTime() >= to.getTime() - ONE_DAY_MS;

  if (coversRange) {
    return cached.map((row) => ({ date: toIsoDate(row.date), rate: row.rate.toNumber(), stale: false }));
  }

  try {
    const points = await getMarketDataProvider().getExchangeRates(base, quote, from, to);
    if (points.length === 0) {
      return cached.map((row) => ({ date: toIsoDate(row.date), rate: row.rate.toNumber(), stale: false }));
    }

    await Promise.all(
      points.map((point) =>
        db.exchangeRate.upsert({
          where: {
            baseCurrency_quoteCurrency_date: {
              baseCurrency: base,
              quoteCurrency: quote,
              date: new Date(`${point.date}T00:00:00Z`),
            },
          },
          update: { rate: point.rate },
          create: {
            baseCurrency: base,
            quoteCurrency: quote,
            date: new Date(`${point.date}T00:00:00Z`),
            rate: point.rate,
          },
        }),
      ),
    );

    const refreshed = await db.exchangeRate.findMany({
      where: { baseCurrency: base, quoteCurrency: quote, date: { gte: from, lte: to } },
      orderBy: { date: "asc" },
    });
    return refreshed.map((row) => ({ date: toIsoDate(row.date), rate: row.rate.toNumber(), stale: false }));
  } catch {
    return cached.map((row) => ({ date: toIsoDate(row.date), rate: row.rate.toNumber(), stale: false }));
  }
}

export interface CachedBenchmarkPrice {
  date: string;
  close: number;
}

/**
 * Historical daily closes for a benchmark, backed by the
 * `benchmark_prices` cache — same "only call the provider when the
 * cached range doesn't already cover the request" strategy as
 * getHistoricalPrices (spec §34: "Benchmark Data יכול להשתמש באותה
 * Historical Prices infrastructure").
 */
export async function getBenchmarkHistoricalPrices(
  benchmarkId: string,
  dataSymbol: string,
  from: Date,
  to: Date,
): Promise<CachedBenchmarkPrice[]> {
  const cached = await db.benchmarkPrice.findMany({
    where: { benchmarkId, date: { gte: from, lte: to } },
    orderBy: { date: "asc" },
  });

  const coversRange =
    cached.length > 0 &&
    cached[0].date.getTime() <= from.getTime() + ONE_DAY_MS &&
    cached[cached.length - 1].date.getTime() >= to.getTime() - ONE_DAY_MS;

  if (coversRange) {
    return cached.map((row) => ({ date: toIsoDate(row.date), close: row.close.toNumber() }));
  }

  try {
    const points = await getMarketDataProvider().getBenchmarkPrices(dataSymbol, from, to);
    if (points.length === 0) {
      return cached.map((row) => ({ date: toIsoDate(row.date), close: row.close.toNumber() }));
    }

    await Promise.all(
      points.map((point) =>
        db.benchmarkPrice.upsert({
          where: { benchmarkId_date: { benchmarkId, date: new Date(`${point.date}T00:00:00Z`) } },
          update: { close: point.close },
          create: { benchmarkId, date: new Date(`${point.date}T00:00:00Z`), close: point.close },
        }),
      ),
    );

    const refreshed = await db.benchmarkPrice.findMany({
      where: { benchmarkId, date: { gte: from, lte: to } },
      orderBy: { date: "asc" },
    });
    return refreshed.map((row) => ({ date: toIsoDate(row.date), close: row.close.toNumber() }));
  } catch {
    return cached.map((row) => ({ date: toIsoDate(row.date), close: row.close.toNumber() }));
  }
}
