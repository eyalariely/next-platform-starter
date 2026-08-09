/**
 * Market Data abstraction (spec §6 / §5 of stage 2).
 *
 * Nothing outside src/lib/market/ and src/services/market-data.service.ts
 * may import a concrete provider directly — business logic always talks to
 * the `MarketDataProvider` interface so the backing API can be swapped via
 * config (MARKET_DATA_PROVIDER) without touching callers.
 */

export interface SecuritySearchResult {
  ticker: string;
  name: string;
  exchange: string;
  currency: string;
  /** Provider's free-text instrument type (e.g. "Equity", "ETF") — mapped
   *  to our SecurityType enum by the caller, never guessed here. */
  rawType?: string;
  country?: string;
}

export interface Quote {
  ticker: string;
  price: number;
  currency: string;
  /** Timestamp the quote is as-of (provider's "latest trading day"/time). */
  asOf: Date;
  previousClose?: number;
  changePercent?: number;
}

export interface HistoricalPricePoint {
  /** ISO date, YYYY-MM-DD. */
  date: string;
  open?: number;
  high?: number;
  low?: number;
  close: number;
  adjustedClose?: number;
  volume?: number;
  currency: string;
}

export interface ExchangeRatePoint {
  /** ISO date, YYYY-MM-DD. */
  date: string;
  rate: number;
}

export interface MarketDataProvider {
  searchSecurity(query: string): Promise<SecuritySearchResult[]>;
  getQuote(symbol: string): Promise<Quote | null>;
  getHistoricalPrices(
    symbol: string,
    from: Date,
    to: Date,
  ): Promise<HistoricalPricePoint[]>;
  getBenchmarkPrices(
    symbol: string,
    from: Date,
    to: Date,
  ): Promise<HistoricalPricePoint[]>;
  getExchangeRates(
    base: string,
    quote: string,
    from: Date,
    to: Date,
  ): Promise<ExchangeRatePoint[]>;
}

export type MarketDataErrorCode =
  | "NOT_CONFIGURED"
  | "RATE_LIMIT"
  | "NOT_FOUND"
  | "PROVIDER_ERROR";

export class MarketDataError extends Error {
  code: MarketDataErrorCode;
  cause?: unknown;

  constructor(message: string, code: MarketDataErrorCode, cause?: unknown) {
    super(message);
    this.name = "MarketDataError";
    this.code = code;
    this.cause = cause;
  }
}
