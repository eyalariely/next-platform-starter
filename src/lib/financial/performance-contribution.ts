/**
 * Performance-by-security and Performance Contribution (spec §11, §23-24)
 * — pure. Deliberately named "performance contribution", not "risk
 * contribution" (spec §23: "אין לבלבל את זה עם Risk Contribution" — that's
 * a different metric entirely, built in the risk engine in a later
 * stage).
 */

export interface SecurityPnLInput {
  securityId: string;
  weight: number | null;
  /** Cost basis of the currently-open position, base currency. */
  investedCapitalBase: number | null;
  totalPnLBase: number | null;
}

export interface SecurityPerformanceRow extends SecurityPnLInput {
  /** totalPnLBase / investedCapitalBase; null when there's no cost basis to divide by. */
  returnPct: number | null;
  /** This security's share of the portfolio's total P/L; null if the
   *  portfolio's total P/L is ~0 (division would be meaningless) or this
   *  security's P/L is unknown. */
  contributionToTotalPnL: number | null;
}

const EPSILON = 1e-9;

export function calculatePerformanceBySecurity(
  holdings: readonly SecurityPnLInput[],
  portfolioTotalPnLBase: number,
): SecurityPerformanceRow[] {
  return holdings.map((h) => {
    const returnPct =
      h.totalPnLBase === null || h.investedCapitalBase === null || h.investedCapitalBase <= EPSILON
        ? null
        : h.totalPnLBase / h.investedCapitalBase;

    const contributionToTotalPnL =
      h.totalPnLBase === null || Math.abs(portfolioTotalPnLBase) < EPSILON
        ? null
        : h.totalPnLBase / portfolioTotalPnLBase;

    return { ...h, returnPct, contributionToTotalPnL };
  });
}
