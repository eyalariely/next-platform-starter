import { describe, expect, it } from "vitest";

import {
  findDuplicateTransaction,
  isDuplicateTransaction,
  type TransactionFingerprint,
} from "@/lib/financial/duplicate-detection";

const base: TransactionFingerprint = {
  securityId: "AAPL-NASDAQ",
  type: "BUY",
  date: "2026-01-05",
  quantity: 10,
  price: 100,
  currency: "USD",
};

describe("isDuplicateTransaction", () => {
  it("matches an identical fingerprint", () => {
    expect(isDuplicateTransaction(base, { ...base })).toBe(true);
  });

  it("ignores time-of-day when comparing dates", () => {
    expect(
      isDuplicateTransaction(base, { ...base, date: "2026-01-05T14:30:00.000Z" }),
    ).toBe(true);
  });

  it("does not match when quantity differs", () => {
    expect(isDuplicateTransaction(base, { ...base, quantity: 11 })).toBe(false);
  });

  it("does not match when price differs", () => {
    expect(isDuplicateTransaction(base, { ...base, price: 100.01 })).toBe(false);
  });

  it("does not match when currency differs", () => {
    expect(isDuplicateTransaction(base, { ...base, currency: "ILS" })).toBe(false);
  });

  it("does not match a different security", () => {
    expect(isDuplicateTransaction(base, { ...base, securityId: "MSFT-NASDAQ" })).toBe(false);
  });

  it("does not match a different transaction type", () => {
    expect(isDuplicateTransaction(base, { ...base, type: "SELL" })).toBe(false);
  });
});

describe("findDuplicateTransaction", () => {
  it("finds the matching entry among several candidates", () => {
    const candidates = [
      { ...base, quantity: 5 },
      { ...base },
      { ...base, price: 200 },
    ];
    expect(findDuplicateTransaction(base, candidates)).toEqual(candidates[1]);
  });

  it("returns null when nothing matches", () => {
    expect(findDuplicateTransaction(base, [{ ...base, quantity: 999 }])).toBeNull();
  });

  it("returns null for an empty existing list", () => {
    expect(findDuplicateTransaction(base, [])).toBeNull();
  });
});
