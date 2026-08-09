/**
 * Performance Engine (spec §2-§10 of stage 3) — pure. No DB, no network,
 * no React. Historical prices/FX are supplied already-loaded by
 * services/performance.service.ts.
 *
 * Methodology (documented per spec §5, §35, §37):
 *
 *  - **TWR, not simple return.** Daily subperiod return neutralizes
 *    external cash flow (DEPOSIT/WITHDRAWAL only):
 *      dailyReturn_t = (V_t - CF_t) / V_{t-1} - 1
 *    TWR / cumulative return is the geometric link of daily returns:
 *      cumulative_t = Π(1 + dailyReturn) - 1
 *    This is never computed as (currentValue - investedCapital) /
 *    investedCapital — that formula is banned by spec §5 because it's
 *    sensitive to the *timing* of deposits, not just investment skill.
 *
 *  - **What counts as external cash flow**: only DEPOSIT and WITHDRAWAL.
 *    DIVIDEND is internal — it lands in cash without external money
 *    coming in, so it correctly shows up as a return (spec §4/§37).
 *    BUY/SELL are cash-neutral reallocations within the portfolio (they
 *    don't change portfolioValueBase at all, only its cash/security
 *    split) and FEE is a real cost already reflected by reducing cash.
 *
 *  - **Historical valuation, never today's price.** Each evaluation date
 *    uses the most recent known price/FX rate on or before that date
 *    (via fx-engine's existing "on or before" fallback) — never the
 *    current live price (spec §3: "אין להשתמש במחיר הנוכחי לצורך
 *    היסטוריה").
 *
 *  - **No split/dividend adjustment beyond what the provider gives us.**
 *    If MarketDataProvider doesn't return split-adjusted history (spec
 *    §36 — Alpha Vantage's free tier doesn't), a stock split will show as
 *    a price discontinuity. This is a documented limitation, not silently
 *    smoothed over.
 *
 *  - **Cold-start prices.** A security's own executed BUY/SELL price on
 *    its transaction date is treated as a valid historical price point
 *    (it's a real, known trade price) — this avoids needing to fabricate
 *    a value for dates before the market-data provider has backfilled
 *    daily history for a freshly-added security.
 */

import {
  convertCurrency,
  getHistoricalFxRate,
  type FxRatePoint,
} from "@/lib/financial/fx-engine";
import { getTransactionCashFlow, type TransactionType } from "@/lib/financial/transaction-amount";

export interface EngineTransaction {
  id: string;
  securityId: string | null;
  type: TransactionType;
  date: string; // ISO date, YYYY-MM-DD
  quantity: number | null;
  price: number | null;
  currency: string;
  fees: number;
  tax: number;
}

export interface HistoricalPricePoint {
  securityId: string;
  date: string; // ISO date
  price: number;
  currency: string;
}

export interface PortfolioValuePoint {
  date: string;
  portfolioValueBase: number;
  cashBase: number;
  /** Net DEPOSIT − WITHDRAWAL that landed on this date, in base currency. */
  externalCashFlowBase: number;
}

export interface DailyReturnPoint extends PortfolioValuePoint {
  /** null for the first point in the series — there is no prior value to compare against (spec §6). */
  dailyReturn: number | null;
  /** Geometrically-linked TWR from the start of the series; null until the first valid daily return exists. */
  cumulativeReturn: number | null;
}

function toBase(
  amount: number,
  currency: string,
  baseCurrency: string,
  fxRates: readonly FxRatePoint[],
  date: string,
): number | null {
  const rate = getHistoricalFxRate(fxRates, currency, baseCurrency, date);
  return rate === null ? null : convertCurrency(amount, rate);
}

/** Finds the most recent price on/before `date` for one security's sorted price series. */
function priceAsOf(
  sortedPrices: readonly HistoricalPricePoint[],
  date: string,
): HistoricalPricePoint | null {
  let result: HistoricalPricePoint | null = null;
  for (const point of sortedPrices) {
    if (point.date > date) break;
    result = point;
  }
  return result;
}

export interface BuildValueSeriesResult {
  series: PortfolioValuePoint[];
  warnings: string[];
}

/**
 * Builds the daily portfolio value series (spec §3). Evaluation dates are
 * the union of every date we have a price update or a transaction for —
 * not literally every calendar day (weekends/holidays have no new data
 * point by construction, which is the standard "as-of" valuation
 * convention, not an interpolation).
 */
export function buildPortfolioValueSeries(
  transactions: readonly EngineTransaction[],
  historicalPrices: readonly HistoricalPricePoint[],
  fxRates: readonly FxRatePoint[],
  baseCurrency: string,
): BuildValueSeriesResult {
  const warnings: string[] = [];

  // Merge each security's provider price history with its own executed
  // trade prices (cold-start coverage), sorted ascending per security.
  const pricesBySecurity = new Map<string, Map<string, HistoricalPricePoint>>();
  const addPrice = (point: HistoricalPricePoint) => {
    if (!pricesBySecurity.has(point.securityId)) {
      pricesBySecurity.set(point.securityId, new Map());
    }
    const bySecurity = pricesBySecurity.get(point.securityId)!;
    if (!bySecurity.has(point.date)) bySecurity.set(point.date, point);
  };
  for (const p of historicalPrices) addPrice(p);
  for (const tx of transactions) {
    if ((tx.type === "BUY" || tx.type === "SELL") && tx.securityId && tx.price !== null) {
      addPrice({ securityId: tx.securityId, date: tx.date, price: tx.price, currency: tx.currency });
    }
  }
  const sortedPricesBySecurity = new Map<string, HistoricalPricePoint[]>();
  for (const [securityId, byDate] of pricesBySecurity) {
    sortedPricesBySecurity.set(
      securityId,
      [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)),
    );
  }

  const evaluationDates = new Set<string>();
  for (const tx of transactions) evaluationDates.add(tx.date);
  for (const points of sortedPricesBySecurity.values()) {
    for (const p of points) evaluationDates.add(p.date);
  }
  const sortedDates = [...evaluationDates].sort();

  const transactionsByDate = new Map<string, EngineTransaction[]>();
  for (const tx of transactions) {
    if (!transactionsByDate.has(tx.date)) transactionsByDate.set(tx.date, []);
    transactionsByDate.get(tx.date)!.push(tx);
  }

  const quantities = new Map<string, number>();
  let cashBase = 0;
  const series: PortfolioValuePoint[] = [];

  for (const date of sortedDates) {
    let externalCashFlowBase = 0;

    for (const tx of transactionsByDate.get(date) ?? []) {
      const flowNative = getTransactionCashFlow(tx);
      const flowBase = toBase(flowNative, tx.currency, baseCurrency, fxRates, date);
      if (flowBase === null) {
        warnings.push(`חסר שער חליפין (${tx.currency} → ${baseCurrency}) בתאריך ${date}`);
      } else {
        cashBase += flowBase;
        if (tx.type === "DEPOSIT" || tx.type === "WITHDRAWAL") {
          externalCashFlowBase += flowBase;
        }
      }

      if (tx.type === "BUY" || tx.type === "SELL") {
        const qty = tx.quantity ?? 0;
        const securityId = tx.securityId!;
        const current = quantities.get(securityId) ?? 0;
        quantities.set(securityId, tx.type === "BUY" ? current + qty : current - qty);
      }
    }

    let holdingsValueBase = 0;
    for (const [securityId, quantity] of quantities) {
      if (quantity <= 0) continue;
      const points = sortedPricesBySecurity.get(securityId);
      const point = points ? priceAsOf(points, date) : null;
      if (!point) {
        warnings.push(`אין נתוני מחיר זמינים עבור ${securityId} עד ${date}`);
        continue;
      }
      const valueBase = toBase(quantity * point.price, point.currency, baseCurrency, fxRates, date);
      if (valueBase === null) {
        warnings.push(`חסר שער חליפין (${point.currency} → ${baseCurrency}) בתאריך ${date}`);
        continue;
      }
      holdingsValueBase += valueBase;
    }

    series.push({
      date,
      portfolioValueBase: holdingsValueBase + cashBase,
      cashBase,
      externalCashFlowBase,
    });
  }

  return { series, warnings };
}

/**
 * Daily TWR + geometric cumulative return from a value series (spec §5-7).
 * The first point never gets a return (no prior value); subsequent points
 * with a non-positive prior value also get `null` rather than a
 * divide-by-zero/misleading number.
 */
export function calculateReturns(series: readonly PortfolioValuePoint[]): DailyReturnPoint[] {
  const result: DailyReturnPoint[] = [];
  let cumulativeFactor = 1;
  let haveValidReturn = false;

  for (let i = 0; i < series.length; i += 1) {
    const point = series[i];
    if (i === 0) {
      result.push({ ...point, dailyReturn: null, cumulativeReturn: null });
      continue;
    }

    const previous = series[i - 1];
    let dailyReturn: number | null = null;
    if (previous.portfolioValueBase > 0) {
      dailyReturn = (point.portfolioValueBase - point.externalCashFlowBase) / previous.portfolioValueBase - 1;
    }

    if (dailyReturn !== null) {
      cumulativeFactor *= 1 + dailyReturn;
      haveValidReturn = true;
    }

    result.push({
      ...point,
      dailyReturn,
      cumulativeReturn: haveValidReturn ? cumulativeFactor - 1 : null,
    });
  }

  return result;
}

/** Returns the subperiod return between two points on the cumulative-return curve, or null if either side is missing. */
function subperiodReturn(
  from: DailyReturnPoint | undefined,
  to: DailyReturnPoint | undefined,
): number | null {
  if (!to || to.cumulativeReturn === null) return null;
  const fromFactor = !from || from.cumulativeReturn === null ? 1 : 1 + from.cumulativeReturn;
  return (1 + to.cumulativeReturn) / fromFactor - 1;
}

export type PeriodKey = "1D" | "1W" | "1M" | "3M" | "YTD" | "1Y" | "SINCE_INCEPTION";

/**
 * Period returns (spec §8). Returns `null` — never a fabricated number —
 * when the series doesn't reach back far enough for that window.
 */
export function calculatePeriodReturns(
  returns: readonly DailyReturnPoint[],
  asOfDate: string,
): Record<PeriodKey, number | null> {
  if (returns.length === 0) {
    return { "1D": null, "1W": null, "1M": null, "3M": null, YTD: null, "1Y": null, SINCE_INCEPTION: null };
  }

  const latest = [...returns].reverse().find((r) => r.date <= asOfDate) ?? returns[returns.length - 1];
  const findAtOrBefore = (targetDate: string) =>
    [...returns].reverse().find((r) => r.date <= targetDate);

  const shiftDate = (isoDate: string, days: number) => {
    const d = new Date(`${isoDate}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  };
  const shiftMonths = (isoDate: string, months: number) => {
    const d = new Date(`${isoDate}T00:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() + months);
    return d.toISOString().slice(0, 10);
  };
  const startOfYear = (isoDate: string) => `${isoDate.slice(0, 4)}-01-01`;

  const seriesStart = returns[0];

  /**
   * A "bounded" period (1D/1W/1M/.../1Y) claims to represent a specific
   * span of time — so it's only honest to report a number when the
   * series actually reaches back that far. If the lookback target
   * predates our earliest data point, that's missing history, not
   * "since inception" (spec §8) — this is the distinction the fix in
   * this function is about: don't silently conflate the two the way an
   * `undefined` "from" defaulting to a 0% baseline would.
   */
  function boundedPeriodReturn(targetDate: string): number | null {
    if (targetDate < seriesStart.date) return null;
    return subperiodReturn(findAtOrBefore(targetDate), latest);
  }

  return {
    "1D": boundedPeriodReturn(shiftDate(latest.date, -1)),
    "1W": boundedPeriodReturn(shiftDate(latest.date, -7)),
    "1M": boundedPeriodReturn(shiftMonths(latest.date, -1)),
    "3M": boundedPeriodReturn(shiftMonths(latest.date, -3)),
    YTD: (() => {
      const yearStart = startOfYear(latest.date);
      // The portfolio began this calendar year — YTD legitimately covers
      // its whole history, so it equals cumulative-from-inception rather
      // than being "missing" data.
      if (seriesStart.date >= yearStart) return subperiodReturn(undefined, latest);
      return boundedPeriodReturn(shiftDate(yearStart, -1));
    })(),
    "1Y": boundedPeriodReturn(shiftMonths(latest.date, -12)),
    SINCE_INCEPTION: latest.cumulativeReturn,
  };
}

export interface MonthlyReturn {
  year: number;
  month: number; // 1-12
  return: number | null;
  isPartial: boolean;
}

/** Monthly return series (spec §9), one entry per calendar month that has data. */
export function calculateMonthlyReturns(returns: readonly DailyReturnPoint[]): MonthlyReturn[] {
  if (returns.length === 0) return [];

  const byMonth = new Map<string, DailyReturnPoint[]>();
  for (const point of returns) {
    const key = point.date.slice(0, 7); // YYYY-MM
    if (!byMonth.has(key)) byMonth.set(key, []);
    byMonth.get(key)!.push(point);
  }

  const sortedKeys = [...byMonth.keys()].sort();
  const today = new Date().toISOString().slice(0, 7);

  return sortedKeys.map((key, index) => {
    const [year, month] = key.split("-").map(Number);
    const pointsInMonth = byMonth.get(key)!;
    const lastInMonth = pointsInMonth[pointsInMonth.length - 1];
    const previousKey = sortedKeys[index - 1];
    const lastOfPrevious = previousKey
      ? byMonth.get(previousKey)![byMonth.get(previousKey)!.length - 1]
      : undefined;

    return {
      year,
      month,
      return: subperiodReturn(lastOfPrevious, lastInMonth),
      isPartial: key === today,
    };
  });
}

export interface AnnualReturn {
  year: number;
  return: number | null;
  isPartial: boolean;
}

/** Annual return series (spec §10). */
export function calculateAnnualReturns(returns: readonly DailyReturnPoint[]): AnnualReturn[] {
  if (returns.length === 0) return [];

  const byYear = new Map<number, DailyReturnPoint[]>();
  for (const point of returns) {
    const year = Number(point.date.slice(0, 4));
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year)!.push(point);
  }

  const sortedYears = [...byYear.keys()].sort((a, b) => a - b);
  const currentYear = new Date().getUTCFullYear();

  return sortedYears.map((year, index) => {
    const pointsInYear = byYear.get(year)!;
    const lastInYear = pointsInYear[pointsInYear.length - 1];
    const previousYear = sortedYears[index - 1];
    const lastOfPrevious = previousYear
      ? byYear.get(previousYear)![byYear.get(previousYear)!.length - 1]
      : undefined;

    return {
      year,
      return: subperiodReturn(lastOfPrevious, lastInYear),
      isPartial: year === currentYear,
    };
  });
}
