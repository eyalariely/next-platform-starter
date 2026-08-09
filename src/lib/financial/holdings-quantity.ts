/**
 * Pure quantity replay, used to validate a SELL before it's written (spec
 * §18 "Sell greater than holding"). Deliberately simpler than the full
 * portfolioEngine average-cost pipeline — this only needs the running
 * quantity, sorted by date, to answer "how much is actually available to
 * sell as of this date".
 */

export interface QuantityTransaction {
  type: "BUY" | "SELL";
  date: string; // ISO date, YYYY-MM-DD
  quantity: number;
}

export function replayQuantity(transactions: readonly QuantityTransaction[]): number {
  const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
  let quantity = 0;
  for (const tx of sorted) {
    quantity += tx.type === "BUY" ? tx.quantity : -tx.quantity;
  }
  return quantity;
}
