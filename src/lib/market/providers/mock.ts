import type {
  ExchangeRatePoint,
  HistoricalPricePoint,
  MarketDataProvider,
  Quote,
  SecuritySearchResult,
} from "@/lib/market/types";

/**
 * Development-only stand-in for a real MarketDataProvider, used when no
 * MARKET_DATA_API_KEY is configured. The factory in provider.ts refuses to
 * construct this outside development as a first guard; the constructor
 * below is a second, defense-in-depth guard so this class can never end up
 * serving production traffic even if wired incorrectly (spec §5).
 *
 * Data is deterministic (seeded from the ticker string), not random, so
 * dev/test runs are repeatable — but it is still synthetic and must never
 * be presented as real quotes.
 */
export class MockMarketDataProvider implements MarketDataProvider {
  constructor() {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "MockMarketDataProvider must never be used in production. Configure MARKET_DATA_API_KEY.",
      );
    }
  }

  async searchSecurity(query: string): Promise<SecuritySearchResult[]> {
    const ticker = query.trim().toUpperCase();
    if (!ticker) return [];

    return [
      {
        ticker,
        name: `${ticker} (Mock Development Data)`,
        exchange: "MOCK",
        currency: "USD",
        rawType: "Equity",
      },
    ];
  }

  async getQuote(symbol: string): Promise<Quote | null> {
    const base = seededPrice(symbol);
    return {
      ticker: symbol,
      price: base,
      currency: "USD",
      asOf: new Date(),
      previousClose: base * 0.99,
      changePercent: 0.01,
    };
  }

  async getHistoricalPrices(
    symbol: string,
    from: Date,
    to: Date,
  ): Promise<HistoricalPricePoint[]> {
    const base = seededPrice(symbol);
    return dateRange(from, to).map((date, index) => {
      const drift = Math.sin(hashString(symbol + date) / 1000) * 0.02;
      const close = round2(base * (1 + drift + index * 0.0002));
      return { date, close, adjustedClose: close, currency: "USD" };
    });
  }

  getBenchmarkPrices(symbol: string, from: Date, to: Date): Promise<HistoricalPricePoint[]> {
    return this.getHistoricalPrices(symbol, from, to);
  }

  async getExchangeRates(
    base: string,
    quote: string,
    from: Date,
    to: Date,
  ): Promise<ExchangeRatePoint[]> {
    if (base === quote) {
      return dateRange(from, to).map((date) => ({ date, rate: 1 }));
    }
    const seed = seededPrice(`${base}${quote}`) / 100;
    return dateRange(from, to).map((date) => ({
      date,
      rate: round4(seed * (1 + Math.sin(hashString(base + quote + date) / 500) * 0.01)),
    }));
  }
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function seededPrice(symbol: string): number {
  return 10 + (hashString(symbol) % 490);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}

function dateRange(from: Date, to: Date): string[] {
  const dates: string[] = [];
  const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()));
  while (cursor.getTime() <= end.getTime()) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}
