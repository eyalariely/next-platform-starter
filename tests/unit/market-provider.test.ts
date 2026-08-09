// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getMarketDataProvider, __resetMarketDataProviderForTests } from "@/lib/market/provider";
import { MockMarketDataProvider } from "@/lib/market/providers/mock";
import { AlphaVantageProvider } from "@/lib/market/providers/alpha-vantage";

describe("getMarketDataProvider", () => {
  beforeEach(() => {
    __resetMarketDataProviderForTests();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    __resetMarketDataProviderForTests();
  });

  it("falls back to the mock provider in development when no API key is set", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("MARKET_DATA_API_KEY", "");

    expect(getMarketDataProvider()).toBeInstanceOf(MockMarketDataProvider);
  });

  it("never falls back to mock data in production — it fails loudly instead", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("MARKET_DATA_API_KEY", "");

    expect(() => getMarketDataProvider()).toThrow(/MARKET_DATA_API_KEY/);
  });

  it("uses the Alpha Vantage adapter once an API key is configured", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("MARKET_DATA_API_KEY", "test-key");
    vi.stubEnv("MARKET_DATA_PROVIDER", "alpha_vantage");

    expect(getMarketDataProvider()).toBeInstanceOf(AlphaVantageProvider);
  });
});

describe("MockMarketDataProvider", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("refuses to run in production even if constructed directly", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(() => new MockMarketDataProvider()).toThrow(/production/);
  });
});
