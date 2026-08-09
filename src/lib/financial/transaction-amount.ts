/**
 * Pure helpers encoding the cash-amount convention for each transaction
 * type (spec §2/§11). Shared by the portfolio engine, the transaction
 * validators, and any UI that wants to preview "total amount" before
 * submit — one source of truth instead of scattered switch statements.
 *
 * Convention:
 *  - BUY / SELL: `quantity` and `price` are both required; the traded
 *    amount is `quantity * price`.
 *  - DIVIDEND / DEPOSIT / WITHDRAWAL / FEE: the total cash amount is
 *    stored directly in `price` (quantity is optional and, for DIVIDEND,
 *    purely informational — e.g. shares held at record date).
 *  - `fees` and `tax` always reduce the money the investor ends up with,
 *    regardless of transaction type.
 */

export type TransactionType =
  | "BUY"
  | "SELL"
  | "DIVIDEND"
  | "DEPOSIT"
  | "WITHDRAWAL"
  | "FEE";

export interface CashFlowTransaction {
  type: TransactionType;
  quantity: number | null;
  price: number | null;
  fees: number;
  tax: number;
}

/** The gross traded amount before fees/tax, in the transaction's own currency. */
export function getTransactionGrossAmount(tx: CashFlowTransaction): number {
  switch (tx.type) {
    case "BUY":
    case "SELL":
      return (tx.quantity ?? 0) * (tx.price ?? 0);
    case "DIVIDEND":
    case "DEPOSIT":
    case "WITHDRAWAL":
    case "FEE":
      return tx.price ?? 0;
  }
}

/**
 * Signed cash impact in the transaction's own currency: positive = cash
 * flows into the portfolio, negative = cash flows out.
 */
export function getTransactionCashFlow(tx: CashFlowTransaction): number {
  const gross = getTransactionGrossAmount(tx);
  const fees = tx.fees ?? 0;
  const tax = tx.tax ?? 0;

  switch (tx.type) {
    case "BUY":
      return -(gross + fees + tax);
    case "SELL":
      return gross - fees - tax;
    case "DIVIDEND":
    case "DEPOSIT":
      return gross - fees - tax;
    case "WITHDRAWAL":
    case "FEE":
      return -(gross + fees + tax);
  }
}
