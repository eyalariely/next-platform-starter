import { describe, expect, it } from "vitest";

import {
  mapRowToRawInput,
  normalizeDate,
  normalizeTransactionType,
  suggestMapping,
} from "@/lib/financial/import-parsing";

describe("normalizeTransactionType", () => {
  it("accepts canonical enum values", () => {
    expect(normalizeTransactionType("BUY")).toBe("BUY");
    expect(normalizeTransactionType("sell")).toBe("SELL");
  });

  it("accepts Hebrew synonyms", () => {
    expect(normalizeTransactionType("קנייה")).toBe("BUY");
    expect(normalizeTransactionType("מכירה")).toBe("SELL");
    expect(normalizeTransactionType("דיבידנד")).toBe("DIVIDEND");
    expect(normalizeTransactionType("הפקדה")).toBe("DEPOSIT");
    expect(normalizeTransactionType("משיכה")).toBe("WITHDRAWAL");
    expect(normalizeTransactionType("עמלה")).toBe("FEE");
  });

  it("returns null for unrecognized values rather than guessing", () => {
    expect(normalizeTransactionType("???")).toBeNull();
  });
});

describe("normalizeDate", () => {
  it("passes through ISO dates", () => {
    expect(normalizeDate("2026-03-15")).toBe("2026-03-15");
  });

  it("converts DD/MM/YYYY to ISO", () => {
    expect(normalizeDate("15/03/2026")).toBe("2026-03-15");
  });

  it("converts DD.MM.YYYY to ISO", () => {
    expect(normalizeDate("5.3.2026")).toBe("2026-03-05");
  });

  it("returns null for an unparseable date instead of guessing", () => {
    expect(normalizeDate("not a date")).toBeNull();
  });
});

describe("suggestMapping", () => {
  it("matches Hebrew and English headers to target fields", () => {
    const mapping = suggestMapping(["תאריך", "סוג", "טיקר", "כמות", "מחיר", "מטבע"]);
    expect(mapping.date).toBe(0);
    expect(mapping.type).toBe(1);
    expect(mapping.ticker).toBe(2);
    expect(mapping.quantity).toBe(3);
    expect(mapping.price).toBe(4);
    expect(mapping.currency).toBe(5);
  });

  it("leaves unmatched fields unmapped rather than guessing a column", () => {
    const mapping = suggestMapping(["col a", "col b"]);
    expect(mapping.date).toBeUndefined();
  });
});

describe("mapRowToRawInput", () => {
  it("maps a well-formed row to the transaction input shape", () => {
    const mapping = suggestMapping(["date", "type", "ticker", "quantity", "price", "currency"]);
    const { raw, rowErrors } = mapRowToRawInput(
      ["2026-01-05", "BUY", "aapl", "10", "150", "usd"],
      mapping,
      "portfolio-1",
    );
    expect(rowErrors).toHaveLength(0);
    expect(raw).toMatchObject({
      type: "BUY",
      date: "2026-01-05",
      ticker: "AAPL",
      quantity: "10",
      price: "150",
      currency: "USD",
      portfolioId: "portfolio-1",
    });
  });

  it("surfaces a row-level error for an unparseable date without throwing", () => {
    const mapping = suggestMapping(["date", "type"]);
    const { rowErrors } = mapRowToRawInput(["garbage", "BUY"], mapping, "portfolio-1");
    expect(rowErrors.some((e) => e.includes("תאריך"))).toBe(true);
  });

  it("surfaces a row-level error for an unrecognized type without throwing", () => {
    const mapping = suggestMapping(["date", "type"]);
    const { rowErrors } = mapRowToRawInput(["2026-01-01", "???"], mapping, "portfolio-1");
    expect(rowErrors.some((e) => e.includes("סוג עסקה"))).toBe(true);
  });
});
