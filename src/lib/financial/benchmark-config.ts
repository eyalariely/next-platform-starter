/**
 * Benchmark configuration (spec §18) — the only place a benchmark's
 * identity/data symbol is hard-coded. Components/pages select a benchmark
 * by `key`; nothing downstream branches on the symbol string directly
 * (spec §18: "אל תקודד Business Logic לפי Ticker ישירות בתוך Components").
 */
export interface BenchmarkDefinition {
  key: string;
  /** Hebrew display name. */
  name: string;
  /** Symbol queried against the MarketDataProvider for price history. */
  dataSymbol: string;
  currency: string;
}

export const BENCHMARKS: readonly BenchmarkDefinition[] = [
  {
    key: "SP500",
    name: "S&P 500",
    // SPY (an S&P 500 ETF) is used as the data proxy — Alpha Vantage's
    // free tier does not serve the raw ^GSPC index.
    dataSymbol: "SPY",
    currency: "USD",
  },
  {
    key: "NASDAQ100",
    name: "NASDAQ 100",
    dataSymbol: "QQQ",
    currency: "USD",
  },
  {
    key: "TA125",
    name: 'ת"א 125',
    dataSymbol: "TA125.TA",
    currency: "ILS",
  },
];

export function getBenchmarkDefinition(key: string): BenchmarkDefinition | undefined {
  return BENCHMARKS.find((b) => b.key === key);
}

export const DEFAULT_BENCHMARK_KEY = "SP500";
