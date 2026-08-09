/**
 * Duplicate transaction detection (spec §13). Pure — takes plain
 * fingerprint objects so it can be tested without a database and reused
 * identically by both manual entry (transaction.service.ts) and CSV/XLSX
 * import (import.service.ts).
 *
 * Fingerprint fields per spec: portfolio, security, type, date, quantity,
 * price, currency. `portfolioId` is implicit here — callers only ever
 * compare candidates already scoped to one portfolio.
 */

export interface TransactionFingerprint {
  securityId: string | null;
  type: string;
  /** ISO date, YYYY-MM-DD (time-of-day is not part of the fingerprint). */
  date: string;
  quantity: number | null;
  price: number | null;
  currency: string;
}

export function isDuplicateTransaction(
  a: TransactionFingerprint,
  b: TransactionFingerprint,
): boolean {
  return (
    a.securityId === b.securityId &&
    a.type === b.type &&
    a.date.slice(0, 10) === b.date.slice(0, 10) &&
    a.quantity === b.quantity &&
    a.price === b.price &&
    a.currency === b.currency
  );
}

/** Returns the first existing fingerprint that matches `candidate`, or null. */
export function findDuplicateTransaction<T extends TransactionFingerprint>(
  candidate: TransactionFingerprint,
  existing: readonly T[],
): T | null {
  return existing.find((e) => isDuplicateTransaction(candidate, e)) ?? null;
}
