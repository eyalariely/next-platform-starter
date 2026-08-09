/**
 * Pure CSV/XLSX import parsing helpers (spec §12) — no file I/O, no DB.
 * services/import.service.ts does the actual file reading (papaparse /
 * exceljs) and DB-backed validation (duplicate check, security
 * resolution); everything here is deterministic string-in/data-out logic
 * so it's fully unit-testable.
 */

export const IMPORT_TARGET_FIELDS = [
  "type",
  "ticker",
  "date",
  "quantity",
  "price",
  "currency",
  "fees",
  "tax",
  "notes",
] as const;

export type ImportTargetField = (typeof IMPORT_TARGET_FIELDS)[number];

/** Maps each target field to a source column index (or -1/undefined = unmapped). */
export type ColumnMapping = Partial<Record<ImportTargetField, number>>;

const TYPE_SYNONYMS: Record<string, string> = {
  buy: "BUY",
  purchase: "BUY",
  "קניה": "BUY",
  "קנייה": "BUY",
  sell: "SELL",
  "מכירה": "SELL",
  dividend: "DIVIDEND",
  "דיבידנד": "DIVIDEND",
  deposit: "DEPOSIT",
  "הפקדה": "DEPOSIT",
  withdrawal: "WITHDRAWAL",
  withdraw: "WITHDRAWAL",
  "משיכה": "WITHDRAWAL",
  fee: "FEE",
  "עמלה": "FEE",
};

export function normalizeTransactionType(raw: string): string | null {
  const trimmed = raw.trim();
  const upper = trimmed.toUpperCase();
  if (["BUY", "SELL", "DIVIDEND", "DEPOSIT", "WITHDRAWAL", "FEE"].includes(upper)) {
    return upper;
  }
  return TYPE_SYNONYMS[trimmed.toLowerCase()] ?? null;
}

/** Accepts ISO (YYYY-MM-DD) and common DD/MM/YYYY input; returns ISO or null. */
export function normalizeDate(raw: string): string | null {
  const trimmed = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const date = new Date(trimmed);
    return Number.isNaN(date.getTime()) ? null : trimmed.slice(0, 10);
  }

  const dmy = trimmed.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/);
  if (dmy) {
    const [, day, month, year] = dmy;
    const iso = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? null : iso;
  }

  return null;
}

/**
 * Guesses a column mapping from header names using simple keyword
 * matching — a starting point the user can always override, never a
 * silent auto-import.
 */
export function suggestMapping(headers: string[]): ColumnMapping {
  const normalized = headers.map((h) => h.trim().toLowerCase());
  const mapping: ColumnMapping = {};

  const keywords: Record<ImportTargetField, string[]> = {
    type: ["type", "סוג"],
    ticker: ["ticker", "symbol", "טיקר", "נייר"],
    date: ["date", "תאריך"],
    quantity: ["quantity", "qty", "כמות"],
    price: ["price", "amount", "מחיר", "סכום"],
    currency: ["currency", "מטבע"],
    fees: ["fee", "עמלה"],
    tax: ["tax", "מס"],
    notes: ["note", "הערה", "הערות"],
  };

  for (const field of IMPORT_TARGET_FIELDS) {
    const index = normalized.findIndex((h) => keywords[field].some((kw) => h.includes(kw)));
    if (index !== -1) mapping[field] = index;
  }

  return mapping;
}

export interface MappedRow {
  raw: Record<string, unknown>;
  rowErrors: string[];
}

/**
 * Turns one raw spreadsheet row into the plain object shape
 * transactionSchema expects, using the column mapping. Field-level
 * *format* problems (unparseable date/type) are caught here as
 * `rowErrors`; full business validation still happens via
 * transactionSchema in import.service.ts.
 */
export function mapRowToRawInput(
  row: string[],
  mapping: ColumnMapping,
  portfolioId: string,
): MappedRow {
  const rowErrors: string[] = [];
  const get = (field: ImportTargetField): string => {
    const index = mapping[field];
    return index === undefined ? "" : (row[index] ?? "").trim();
  };

  const typeRaw = get("type");
  const type = typeRaw ? normalizeTransactionType(typeRaw) : null;
  if (typeRaw && !type) rowErrors.push(`סוג עסקה לא מזוהה: "${typeRaw}"`);

  const dateRaw = get("date");
  const date = dateRaw ? normalizeDate(dateRaw) : null;
  if (dateRaw && !date) rowErrors.push(`תאריך לא ניתן לפענוח: "${dateRaw}"`);

  const raw: Record<string, unknown> = {
    type: type ?? typeRaw,
    portfolioId,
    date: date ?? dateRaw,
    currency: get("currency").toUpperCase(),
    fees: get("fees") || 0,
    tax: get("tax") || 0,
    notes: get("notes") || undefined,
    confirmFutureDate: true, // imports of historical/scheduled data are explicit by nature
  };

  const quantity = get("quantity");
  if (quantity) raw.quantity = quantity;
  const price = get("price");
  if (price) raw.price = price;
  const ticker = get("ticker");
  if (ticker) raw.ticker = ticker.toUpperCase();

  return { raw, rowErrors };
}
