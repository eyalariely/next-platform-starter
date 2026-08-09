import { describe, expect, it } from "vitest";

import { replayQuantity } from "@/lib/financial/holdings-quantity";

describe("replayQuantity", () => {
  it("sums BUYs and subtracts SELLs in date order", () => {
    const quantity = replayQuantity([
      { type: "BUY", date: "2026-01-01", quantity: 10 },
      { type: "SELL", date: "2026-01-05", quantity: 4 },
      { type: "BUY", date: "2026-01-10", quantity: 2 },
    ]);
    expect(quantity).toBe(8);
  });

  it("is order-independent — sorts by date regardless of input order", () => {
    const quantity = replayQuantity([
      { type: "BUY", date: "2026-01-10", quantity: 2 },
      { type: "BUY", date: "2026-01-01", quantity: 10 },
      { type: "SELL", date: "2026-01-05", quantity: 4 },
    ]);
    expect(quantity).toBe(8);
  });

  it("returns 0 for an empty transaction list", () => {
    expect(replayQuantity([])).toBe(0);
  });

  it("can reflect a fully closed position", () => {
    const quantity = replayQuantity([
      { type: "BUY", date: "2026-01-01", quantity: 5 },
      { type: "SELL", date: "2026-01-02", quantity: 5 },
    ]);
    expect(quantity).toBe(0);
  });
});
