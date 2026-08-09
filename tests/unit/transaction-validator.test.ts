import { describe, expect, it } from "vitest";

import { transactionSchema } from "@/validators/transaction";

const base = {
  portfolioId: "p1",
  currency: "USD",
  fees: 0,
  tax: 0,
};

describe("transactionSchema", () => {
  it("accepts a valid BUY", () => {
    const result = transactionSchema.safeParse({
      ...base,
      type: "BUY",
      securityId: "s1",
      date: "2026-01-01",
      quantity: 10,
      price: 100,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a negative quantity", () => {
    const result = transactionSchema.safeParse({
      ...base,
      type: "BUY",
      securityId: "s1",
      date: "2026-01-01",
      quantity: -5,
      price: 100,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a negative price", () => {
    const result = transactionSchema.safeParse({
      ...base,
      type: "BUY",
      securityId: "s1",
      date: "2026-01-01",
      quantity: 5,
      price: -1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects BUY without a security", () => {
    const result = transactionSchema.safeParse({
      ...base,
      type: "BUY",
      date: "2026-01-01",
      quantity: 5,
      price: 100,
    });
    expect(result.success).toBe(false);
  });

  it("rejects SELL without a security", () => {
    const result = transactionSchema.safeParse({
      ...base,
      type: "SELL",
      date: "2026-01-01",
      quantity: 5,
      price: 100,
    });
    expect(result.success).toBe(false);
  });

  it("rejects DIVIDEND without a security", () => {
    const result = transactionSchema.safeParse({
      ...base,
      type: "DIVIDEND",
      date: "2026-01-01",
      price: 20,
    });
    expect(result.success).toBe(false);
  });

  it("accepts DEPOSIT/WITHDRAWAL/FEE without a security", () => {
    for (const type of ["DEPOSIT", "WITHDRAWAL", "FEE"] as const) {
      const result = transactionSchema.safeParse({ ...base, type, date: "2026-01-01", price: 100 });
      expect(result.success, `${type} should be valid without a security`).toBe(true);
    }
  });

  it("rejects a transaction with no portfolio", () => {
    const result = transactionSchema.safeParse({
      currency: "USD",
      fees: 0,
      tax: 0,
      type: "DEPOSIT",
      date: "2026-01-01",
      price: 100,
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unsupported currency", () => {
    const result = transactionSchema.safeParse({
      ...base,
      currency: "XYZ",
      type: "DEPOSIT",
      date: "2026-01-01",
      price: 100,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a future-dated transaction without explicit confirmation", () => {
    const farFuture = new Date();
    farFuture.setFullYear(farFuture.getFullYear() + 1);
    const result = transactionSchema.safeParse({
      ...base,
      type: "DEPOSIT",
      date: farFuture.toISOString().slice(0, 10),
      price: 100,
    });
    expect(result.success).toBe(false);
  });

  it("accepts a future-dated transaction once confirmFutureDate is set", () => {
    const farFuture = new Date();
    farFuture.setFullYear(farFuture.getFullYear() + 1);
    const result = transactionSchema.safeParse({
      ...base,
      type: "DEPOSIT",
      date: farFuture.toISOString().slice(0, 10),
      price: 100,
      confirmFutureDate: true,
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid date string", () => {
    const result = transactionSchema.safeParse({
      ...base,
      type: "DEPOSIT",
      date: "not-a-date",
      price: 100,
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative fees/tax", () => {
    const result = transactionSchema.safeParse({
      ...base,
      fees: -1,
      type: "DEPOSIT",
      date: "2026-01-01",
      price: 100,
    });
    expect(result.success).toBe(false);
  });
});
