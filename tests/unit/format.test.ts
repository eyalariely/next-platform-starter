import { describe, expect, it } from "vitest";

import { formatCurrency, formatPercent, formatTicker } from "@/lib/format";

describe("formatPercent", () => {
  it("formats a decimal fraction as a percentage with the requested precision", () => {
    expect(formatPercent(0.3229)).toBe("32.29%");
  });

  it("keeps the sign for negative values", () => {
    expect(formatPercent(-0.015, 1)).toBe("-1.5%");
  });

  it("does not round mid-calculation — only at the display boundary", () => {
    const internal = 1 / 3; // 0.3333...
    expect(formatPercent(internal, 2)).toBe("33.33%");
  });
});

describe("formatCurrency", () => {
  it("formats using the given currency code, not an assumed one", () => {
    expect(formatCurrency(1234.5, "USD")).toBe("$1,234.50");
    expect(formatCurrency(1234.5, "ILS")).toContain("1,234.50");
  });
});

describe("formatTicker", () => {
  it("renders tickers upper-case", () => {
    expect(formatTicker("nvda")).toBe("NVDA");
  });
});
