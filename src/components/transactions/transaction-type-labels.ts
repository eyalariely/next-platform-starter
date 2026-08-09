export const TRANSACTION_TYPES = [
  "BUY",
  "SELL",
  "DIVIDEND",
  "DEPOSIT",
  "WITHDRAWAL",
  "FEE",
] as const;

export type TransactionTypeValue = (typeof TRANSACTION_TYPES)[number];

export const TRANSACTION_TYPE_LABELS: Record<TransactionTypeValue, string> = {
  BUY: "קנייה",
  SELL: "מכירה",
  DIVIDEND: "דיבידנד",
  DEPOSIT: "הפקדה",
  WITHDRAWAL: "משיכה",
  FEE: "עמלה",
};

export const SECURITY_REQUIRED_TYPES = new Set<TransactionTypeValue>(["BUY", "SELL", "DIVIDEND"]);
export const QUANTITY_TYPES = new Set<TransactionTypeValue>(["BUY", "SELL"]);
