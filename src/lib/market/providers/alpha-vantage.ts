import "server-only";

import type {
  ExchangeRatePoint,
  HistoricalPricePoint,
  MarketDataProvider,
  Quote,
  SecuritySearchResult,
} from "@/lib/market/types";
import { MarketDataError } from "@/lib/market/types";

const BASE_URL = "https://www.alphavantage.co/query";

type AlphaVantageResponse = Record<string, unknown>;

/**
 * Alpha Vantage adapter — the first real MarketDataProvider implementation
 * (spec §5/§6). Chosen because it has a usable free tier and covers
 * quotes, daily history, symbol search, and FX in one API.
 *
 * Swapping providers later means writing one more file implementing
 * `MarketDataProvider` and pointing MARKET_DATA_PROVIDER at it — nothing
 * else in the app changes.
 *
 * Known limitation: the free tier does not include split/dividend-adjusted
 * daily history (TIME_SERIES_DAILY_ADJUSTED is premium-only), so
 * `adjustedClose` falls back to the raw close price.
 */
export class AlphaVantageProvider implements MarketDataProvider {
  constructor(private readonly apiKey: string) {}

  async searchSecurity(query: string): Promise<SecuritySearchResult[]> {
    const data = await this.request({ function: "SYMBOL_SEARCH", keywords: query });
    const matches = asArray(data["bestMatches"]);

    return matches.map((match) => ({
      ticker: String(match["1. symbol"] ?? ""),
      name: String(match["2. name"] ?? ""),
      exchange: String(match["4. region"] ?? ""),
      currency: String(match["8. currency"] ?? ""),
      rawType: match["3. type"] ? String(match["3. type"]) : undefined,
    }));
  }

  async getQuote(symbol: string): Promise<Quote | null> {
    const data = await this.request({ function: "GLOBAL_QUOTE", symbol });
    const raw = data["Global Quote"] as Record<string, unknown> | undefined;
    if (!raw || Object.keys(raw).length === 0) return null;

    const price = parseNumber(raw["05. price"]);
    const previousClose = parseNumber(raw["08. previous close"]);
    const tradingDay = String(raw["07. latest trading day"] ?? "");
    if (price === null || !tradingDay) return null;

    return {
      ticker: symbol,
      price,
      // Alpha Vantage's GLOBAL_QUOTE does not return currency; the caller
      // (market-data.service) fills it in from our Security record.
      currency: "",
      asOf: new Date(`${tradingDay}T00:00:00Z`),
      previousClose: previousClose ?? undefined,
      changePercent: parsePercent(raw["10. change percent"]),
    };
  }

  async getHistoricalPrices(
    symbol: string,
    from: Date,
    to: Date,
  ): Promise<HistoricalPricePoint[]> {
    const data = await this.request({
      function: "TIME_SERIES_DAILY",
      symbol,
      outputsize: "full",
    });
    const series = data["Time Series (Daily)"] as
      | Record<string, Record<string, string>>
      | undefined;
    if (!series) return [];

    return Object.entries(series)
      .filter(([date]) => isWithinRange(date, from, to))
      .map(([date, values]) => ({
        date,
        open: parseNumber(values["1. open"]) ?? undefined,
        high: parseNumber(values["2. high"]) ?? undefined,
        low: parseNumber(values["3. low"]) ?? undefined,
        close: parseNumber(values["4. close"]) ?? 0,
        adjustedClose: parseNumber(values["4. close"]) ?? undefined,
        volume: parseNumber(values["5. volume"]) ?? undefined,
        currency: "",
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  getBenchmarkPrices(symbol: string, from: Date, to: Date): Promise<HistoricalPricePoint[]> {
    // Benchmarks (index proxies like SPY/QQQ) are ordinary tradeable
    // symbols from Alpha Vantage's point of view.
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

    const data = await this.request({
      function: "FX_DAILY",
      from_symbol: base,
      to_symbol: quote,
      outputsize: "full",
    });
    const series = data["Time Series FX (Daily)"] as
      | Record<string, Record<string, string>>
      | undefined;
    if (!series) return [];

    return Object.entries(series)
      .filter(([date]) => isWithinRange(date, from, to))
      .map(([date, values]) => ({
        date,
        rate: parseNumber(values["4. close"]) ?? 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private async request(params: Record<string, string>): Promise<AlphaVantageResponse> {
    const url = new URL(BASE_URL);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    url.searchParams.set("apikey", this.apiKey);

    let response: Response;
    try {
      response = await fetch(url.toString(), { cache: "no-store" });
    } catch (cause) {
      throw new MarketDataError("שגיאת רשת בפנייה לספק נתוני השוק", "PROVIDER_ERROR", cause);
    }

    if (!response.ok) {
      throw new MarketDataError(
        `ספק נתוני השוק החזיר שגיאה (${response.status})`,
        "PROVIDER_ERROR",
      );
    }

    const data = (await response.json()) as AlphaVantageResponse;

    if (typeof data["Note"] === "string") {
      throw new MarketDataError(
        "חריגה ממכסת הבקשות לספק נתוני השוק, נסה שוב מאוחר יותר",
        "RATE_LIMIT",
      );
    }
    if (typeof data["Information"] === "string") {
      throw new MarketDataError(
        "חריגה ממכסת הבקשות היומית לספק נתוני השוק",
        "RATE_LIMIT",
      );
    }
    if (typeof data["Error Message"] === "string") {
      throw new MarketDataError(String(data["Error Message"]), "NOT_FOUND");
    }

    return data;
  }
}

function asArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
}

function parseNumber(value: unknown): number | null {
  if (value === undefined || value === null) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function parsePercent(value: unknown): number | undefined {
  if (typeof value !== "string") return undefined;
  const num = Number(value.replace("%", ""));
  return Number.isFinite(num) ? num / 100 : undefined;
}

function isWithinRange(isoDate: string, from: Date, to: Date): boolean {
  const time = new Date(`${isoDate}T00:00:00Z`).getTime();
  return time >= from.getTime() && time <= to.getTime();
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
