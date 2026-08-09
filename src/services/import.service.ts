import "server-only";

import Papa from "papaparse";
import ExcelJS from "exceljs";

import { db } from "@/lib/db";
import { transactionSchema } from "@/validators/transaction";
import { mapRowToRawInput, type ColumnMapping } from "@/lib/financial/import-parsing";
import { findDuplicateTransaction, type TransactionFingerprint } from "@/lib/financial/duplicate-detection";
import { findOrCreateSecurity, SecurityNotFoundError } from "@/services/security.service";
import { createTransaction } from "@/services/transaction.service";

// Hard cap so a huge accidental upload can't hang the request or blow up
// memory — the wizard tells the user the file was truncated.
const MAX_ROWS = 2000;

export interface ParsedFile {
  headers: string[];
  rows: string[][];
  truncated: boolean;
}

export async function parseImportFile(
  buffer: Buffer,
  filename: string,
): Promise<ParsedFile> {
  const isXlsx = /\.xlsx$/i.test(filename);

  if (isXlsx) {
    const workbook = new ExcelJS.Workbook();
    // exceljs's Buffer type predates the newer resizable-ArrayBuffer
    // fields on @types/node's Buffer; the object itself is a real Buffer
    // at runtime, so this cast just bridges a type-declaration mismatch.
    await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
    const sheet = workbook.worksheets[0];
    if (!sheet) return { headers: [], rows: [], truncated: false };

    const allRows: string[][] = [];
    sheet.eachRow((row) => {
      const values = (row.values as ExcelJS.CellValue[]).slice(1); // index 0 is unused by ExcelJS
      allRows.push(values.map((v) => cellToString(v)));
    });

    const [headers, ...rows] = allRows;
    return {
      headers: headers ?? [],
      rows: rows.slice(0, MAX_ROWS),
      truncated: rows.length > MAX_ROWS,
    };
  }

  const text = buffer.toString("utf-8");
  const result = Papa.parse<string[]>(text, { skipEmptyLines: true });
  const [headers, ...rows] = result.data;
  return {
    headers: headers ?? [],
    rows: rows.slice(0, MAX_ROWS),
    truncated: rows.length > MAX_ROWS,
  };
}

function cellToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object" && "text" in value) return String(value.text);
  if (typeof value === "object" && "result" in value) return String(value.result);
  return String(value);
}

export type ImportRowStatus = "valid" | "invalid" | "warning";

export interface ImportRowResult {
  rowIndex: number;
  status: ImportRowStatus;
  errors: string[];
  warnings: string[];
  preview: Record<string, unknown>;
  /** Only present when status is "valid" or "warning" — the wire-ready
   *  payload for commitImportRows. */
  validated?: Record<string, unknown>;
  duplicateOfId?: string;
}

/**
 * Validates every mapped row (spec §12/§13): Zod validation for
 * shape/business rules, plus duplicate-fingerprint checking against both
 * existing DB transactions and other rows in the same file (so an
 * accidental copy-pasted duplicate inside one file is caught too).
 * Never imports anything itself — purely a dry run.
 */
export async function validateImportRows(
  portfolioId: string,
  rows: string[][],
  mapping: ColumnMapping,
): Promise<ImportRowResult[]> {
  const existingTransactions = await db.transaction.findMany({
    where: { portfolioId },
    include: { security: true },
  });
  const existingFingerprints: (TransactionFingerprint & { id: string })[] = existingTransactions.map(
    (tx) => ({
      id: tx.id,
      securityId: tx.securityId,
      type: tx.transactionType,
      date: tx.date.toISOString().slice(0, 10),
      quantity: tx.quantity?.toNumber() ?? null,
      price: tx.price?.toNumber() ?? null,
      currency: tx.currency,
    }),
  );

  const seenInFile: TransactionFingerprint[] = [];
  const results: ImportRowResult[] = [];
  const securityCache = new Map<string, string | null>(); // ticker -> securityId | null (not found)

  for (let i = 0; i < rows.length; i += 1) {
    const { raw, rowErrors } = mapRowToRawInput(rows[i], mapping, portfolioId);
    const errors = [...rowErrors];
    const warnings: string[] = [];

    let securityId: string | null = null;
    const ticker = typeof raw.ticker === "string" ? raw.ticker : undefined;
    if (ticker) {
      if (securityCache.has(ticker)) {
        securityId = securityCache.get(ticker) ?? null;
      } else {
        try {
          const security = await findOrCreateSecurity(ticker, "");
          securityId = security.id;
        } catch (error) {
          securityId = null;
          if (error instanceof SecurityNotFoundError) {
            errors.push(error.message);
          }
        }
        securityCache.set(ticker, securityId);
      }
    }

    const forValidation = { ...raw };
    if (securityId) forValidation.securityId = securityId;
    delete forValidation.ticker;

    const parsed = errors.length === 0 ? transactionSchema.safeParse(forValidation) : null;
    if (parsed && !parsed.success) {
      errors.push(...parsed.error.issues.map((issue) => issue.message));
    }

    let duplicateOfId: string | undefined;
    if (parsed?.success) {
      const candidateFingerprint: TransactionFingerprint = {
        securityId: securityId,
        type: parsed.data.type,
        date: parsed.data.date.slice(0, 10),
        quantity: "quantity" in parsed.data ? (parsed.data.quantity ?? null) : null,
        price: parsed.data.price ?? null,
        currency: parsed.data.currency,
      };

      const dbMatch = findDuplicateTransaction(candidateFingerprint, existingFingerprints);
      const fileMatch = findDuplicateTransaction(candidateFingerprint, seenInFile);
      if (dbMatch) {
        duplicateOfId = dbMatch.id;
        warnings.push("עסקה זהה כבר קיימת בתיק");
      } else if (fileMatch) {
        warnings.push("שורה כפולה בתוך אותו קובץ");
      }
      seenInFile.push(candidateFingerprint);
    }

    const status: ImportRowStatus =
      errors.length > 0 ? "invalid" : warnings.length > 0 ? "warning" : "valid";

    results.push({
      rowIndex: i,
      status,
      errors,
      warnings,
      preview: raw,
      validated: parsed?.success ? forValidation : undefined,
      duplicateOfId,
    });
  }

  return results;
}

export interface CommitImportResult {
  imported: number;
  skipped: number;
  failed: { rowIndex: number; error: string }[];
}

/**
 * Actually writes the rows the user confirmed. Each row still goes
 * through transaction.service.createTransaction — same validation,
 * sell-guard, and (for confirmed duplicates) `force` path as manual entry
 * (spec §19: import must not bypass the engine's own rules).
 */
export async function commitImportRows(
  userId: string,
  rows: { validated: Record<string, unknown>; force?: boolean }[],
): Promise<CommitImportResult> {
  let imported = 0;
  let skipped = 0;
  const failed: { rowIndex: number; error: string }[] = [];

  for (let i = 0; i < rows.length; i += 1) {
    const parsed = transactionSchema.safeParse(rows[i].validated);
    if (!parsed.success) {
      failed.push({ rowIndex: i, error: parsed.error.issues[0]?.message ?? "שורה לא תקינה" });
      continue;
    }
    try {
      await createTransaction(userId, parsed.data, { force: rows[i].force ?? false });
      imported += 1;
    } catch (error) {
      skipped += 1;
      failed.push({
        rowIndex: i,
        error: error instanceof Error ? error.message : "שגיאה לא ידועה",
      });
    }
  }

  return { imported, skipped, failed };
}
