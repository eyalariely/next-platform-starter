import "server-only";

import type { MarketDataProvider } from "@/lib/market/types";
import { MarketDataError } from "@/lib/market/types";
import { AlphaVantageProvider } from "@/lib/market/providers/alpha-vantage";
import { MockMarketDataProvider } from "@/lib/market/providers/mock";

/**
 * The only place in the app allowed to know which concrete
 * MarketDataProvider is in use. Everything else — services, engines,
 * routes — depends on the `MarketDataProvider` interface only, so
 * switching providers is a change confined to this file plus one new
 * adapter (spec §6).
 */
let cachedProvider: MarketDataProvider | null = null;

export function getMarketDataProvider(): MarketDataProvider {
  if (cachedProvider) return cachedProvider;

  const apiKey = process.env.MARKET_DATA_API_KEY;
  const providerName = process.env.MARKET_DATA_PROVIDER || "alpha_vantage";

  if (!apiKey) {
    if (process.env.NODE_ENV === "production") {
      throw new MarketDataError(
        "MARKET_DATA_API_KEY אינו מוגדר — לא ניתן להשתמש בנתוני Mock בסביבת production",
        "NOT_CONFIGURED",
      );
    }
    cachedProvider = new MockMarketDataProvider();
    return cachedProvider;
  }

  switch (providerName) {
    case "alpha_vantage":
      cachedProvider = new AlphaVantageProvider(apiKey);
      break;
    default:
      throw new MarketDataError(
        `MARKET_DATA_PROVIDER לא מוכר: "${providerName}"`,
        "NOT_CONFIGURED",
      );
  }

  return cachedProvider;
}

/** Test-only: reset the cached provider between test cases. */
export function __resetMarketDataProviderForTests() {
  cachedProvider = null;
}
