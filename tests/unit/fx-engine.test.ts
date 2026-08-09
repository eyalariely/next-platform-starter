import { describe, expect, it } from "vitest";

import {
  convertCurrency,
  getHistoricalFxRate,
  normalizeToPortfolioCurrency,
  type FxRatePoint,
} from "@/lib/financial/fx-engine";

describe("convertCurrency", () => {
  it("multiplies amount by rate", () => {
    expect(convertCurrency(100, 3.7)).toBe(370);
  });
});

describe("getHistoricalFxRate", () => {
  it("returns 1 for same-currency conversions without needing rate data", () => {
    expect(getHistoricalFxRate([], "USD", "USD", "2026-01-01")).toBe(1);
  });

  it("resolves an exact-date direct pair", () => {
    const rates: FxRatePoint[] = [
      { baseCurrency: "USD", quoteCurrency: "ILS", date: "2026-01-01", rate: 3.7 },
    ];
    expect(getHistoricalFxRate(rates, "USD", "ILS", "2026-01-01")).toBe(3.7);
  });

  it("resolves the inverse pair when only that direction is stored", () => {
    const rates: FxRatePoint[] = [
      { baseCurrency: "ILS", quoteCurrency: "USD", date: "2026-01-01", rate: 0.27 },
    ];
    expect(getHistoricalFxRate(rates, "USD", "ILS", "2026-01-01")).toBeCloseTo(1 / 0.27, 6);
  });

  it("falls back to the most recent rate on/before the requested date", () => {
    const rates: FxRatePoint[] = [
      { baseCurrency: "USD", quoteCurrency: "ILS", date: "2026-01-01", rate: 3.6 },
      { baseCurrency: "USD", quoteCurrency: "ILS", date: "2026-01-03", rate: 3.7 },
    ];
    // No rate stored for 1/5 — should use the most recent (1/3), not 1/1.
    expect(getHistoricalFxRate(rates, "USD", "ILS", "2026-01-05")).toBe(3.7);
  });

  it("never uses a future rate to fill a gap", () => {
    const rates: FxRatePoint[] = [
      { baseCurrency: "USD", quoteCurrency: "ILS", date: "2026-01-10", rate: 3.9 },
    ];
    expect(getHistoricalFxRate(rates, "USD", "ILS", "2026-01-05")).toBeNull();
  });

  it("returns null (not a guess) when no data covers the pair at all", () => {
    const rates: FxRatePoint[] = [
      { baseCurrency: "USD", quoteCurrency: "ILS", date: "2026-01-01", rate: 3.7 },
    ];
    expect(getHistoricalFxRate(rates, "EUR", "GBP", "2026-01-01")).toBeNull();
  });

  it("does not assume USD as an intermediate/default currency", () => {
    const rates: FxRatePoint[] = [
      { baseCurrency: "EUR", quoteCurrency: "ILS", date: "2026-01-01", rate: 4.0 },
    ];
    // No USD anywhere in the table — a direct EUR/ILS pair must still resolve.
    expect(getHistoricalFxRate(rates, "EUR", "ILS", "2026-01-01")).toBe(4.0);
  });
});

describe("normalizeToPortfolioCurrency", () => {
  it("converts an amount into the base currency using the matching rate", () => {
    const rates: FxRatePoint[] = [
      { baseCurrency: "USD", quoteCurrency: "ILS", date: "2026-01-01", rate: 3.7 },
    ];
    expect(normalizeToPortfolioCurrency(100, "USD", "ILS", rates, "2026-01-01")).toBe(370);
  });

  it("passes an already-base-currency amount through unchanged", () => {
    expect(normalizeToPortfolioCurrency(250, "ILS", "ILS", [], "2026-01-01")).toBe(250);
  });

  it("returns null instead of a fabricated number when FX data is missing", () => {
    expect(normalizeToPortfolioCurrency(100, "JPY", "ILS", [], "2026-01-01")).toBeNull();
  });
});
