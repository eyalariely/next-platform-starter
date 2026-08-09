/**
 * Portfolio/Holdings Engine (spec §7, §9, §10, §11) — pure. No DB, no
 * network, no React. Everything it needs (transactions, current prices,
 * FX rates) is passed in already-loaded; src/services/holdings.service.ts
 * is the impure orchestration layer that loads that data and calls this.
 *
 * Average-cost convention (spec §10):
 *  - BUY increases quantity and re-averages cost; SELL reduces quantity
 *    only — it never changes the average cost of what remains.
 *  - Realized P/L on a SELL = proceeds (price*qty - fees - tax) minus the
 *    cost basis removed (qty * averageCost at the time of sale).
 *  - Dividends are cash income and do not affect a position's cost basis
 *    or count toward its realized/unrealized P/L (they show up in `cash`
 *    and, from stage 3 onward, in total-return performance figures).
 *
 * Multi-currency (spec §7/§8): each security's lots are tracked in its
 * own "cost currency" (the currency of its first transaction) *and*, in
 * parallel, in the portfolio's base currency (converted at each
 * transaction's own date) — so `averageCost` is always meaningful in a
 * single native currency while `unrealizedPnLBase`/`weight`/portfolio
 * totals are always in one consistent base currency. A transaction whose
 * currency differs from a security's established cost currency is still
 * converted correctly; it just needs FX coverage for that date (§18
 * "Missing FX" — surfaced as a warning, never silently zeroed).
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
  /** ISO date, YYYY-MM-DD. */
  date: string;
  quantity: number | null;
  price: number | null;
  currency: string;
  fees: number;
  tax: number;
}

export interface CurrentPrice {
  securityId: string;
  price: number;
  currency: string;
}

export interface HoldingResult {
  securityId: string;
  quantity: number;
  /** Average cost per unit, in `costCurrency` (never a mixed/blended currency). */
  averageCost: number;
  costCurrency: string;
  marketPrice: number | null;
  marketValue: number | null;
  marketValueBase: number | null;
  /** Decimal 0..1 of total portfolio value; null when not computable. */
  weight: number | null;
  realizedPnLBase: number;
  unrealizedPnLBase: number | null;
  unrealizedPnLPct: number | null;
  totalPnLBase: number | null;
  missingPriceData: boolean;
}

export interface PortfolioSummary {
  baseCurrency: string;
  portfolioValueBase: number;
  cashBase: number;
  investedCapitalBase: number;
  realizedPnLBase: number;
  unrealizedPnLBase: number;
  totalPnLBase: number;
  holdings: HoldingResult[];
  warnings: string[];
}

export interface CalculateHoldingsInput {
  transactions: readonly EngineTransaction[];
  currentPrices: readonly CurrentPrice[];
  fxRates: readonly FxRatePoint[];
  baseCurrency: string;
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

interface SecurityLotState {
  quantity: number;
  averageCostNative: number;
  costCurrency: string | null;
  averageCostBase: number;
  realizedPnLBase: number;
}

function processSecurityLots(
  securityId: string,
  transactions: readonly EngineTransaction[],
  fxRates: readonly FxRatePoint[],
  baseCurrency: string,
  warnings: string[],
): SecurityLotState {
  const state: SecurityLotState = {
    quantity: 0,
    averageCostNative: 0,
    costCurrency: null,
    averageCostBase: 0,
    realizedPnLBase: 0,
  };

  const sorted = [...transactions].sort(
    (a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id),
  );

  for (const tx of sorted) {
    if (tx.type !== "BUY" && tx.type !== "SELL") continue;

    const quantity = tx.quantity ?? 0;
    const price = tx.price ?? 0;
    if (quantity <= 0 || price < 0) {
      warnings.push(
        `עסקה ${tx.id} עבור ${securityId} דולגה בחישוב האחזקות (כמות/מחיר לא תקינים)`,
      );
      continue;
    }

    state.costCurrency ??= tx.currency;

    // Native-currency amount, converted into this security's cost
    // currency if the transaction itself used a different one.
    const nativeRate =
      tx.currency === state.costCurrency
        ? 1
        : getHistoricalFxRate(fxRates, tx.currency, state.costCurrency, tx.date);

    const baseAmountRaw = tx.quantity !== null && tx.price !== null
      ? quantity * price + (tx.type === "SELL" ? -tx.fees - tx.tax : tx.fees + tx.tax)
      : 0;
    const baseAmount = toBase(baseAmountRaw, tx.currency, baseCurrency, fxRates, tx.date);

    if (nativeRate === null || baseAmount === null) {
      warnings.push(
        `חסר שער חליפין (${tx.currency}) עבור עסקה ${tx.id} בתאריך ${tx.date} — הנייר ${securityId} עשוי להיות לא מדויק`,
      );
    }

    if (tx.type === "BUY") {
      const costNative = nativeRate === null ? null : (quantity * price + tx.fees + tx.tax) * nativeRate;
      const newQuantity = state.quantity + quantity;

      if (costNative !== null) {
        state.averageCostNative =
          newQuantity > 0
            ? (state.quantity * state.averageCostNative + costNative) / newQuantity
            : 0;
      }
      if (baseAmount !== null) {
        state.averageCostBase =
          newQuantity > 0
            ? (state.quantity * state.averageCostBase + baseAmount) / newQuantity
            : 0;
      }
      state.quantity = newQuantity;
    } else {
      // SELL — never sell more than is held; cap and warn instead of
      // going negative or throwing (spec §18).
      const sellQuantity = Math.min(quantity, state.quantity);
      if (sellQuantity < quantity) {
        warnings.push(
          `עסקת מכירה ${tx.id} עבור ${securityId} עולה על הכמות המוחזקת בתאריך ${tx.date} — הכמות קוצצה`,
        );
      }
      if (sellQuantity <= 0) continue;

      const costRemovedBase = sellQuantity * state.averageCostBase;
      const proceedsBase =
        baseAmount === null ? null : (baseAmount / quantity) * sellQuantity;

      if (proceedsBase !== null) {
        state.realizedPnLBase += proceedsBase - costRemovedBase;
      }

      state.quantity -= sellQuantity;
      // averageCostNative / averageCostBase intentionally unchanged.
    }
  }

  return state;
}

function computeCashBase(
  transactions: readonly EngineTransaction[],
  fxRates: readonly FxRatePoint[],
  baseCurrency: string,
  warnings: string[],
): number {
  let cashBase = 0;

  for (const tx of transactions) {
    const flowNative = getTransactionCashFlow(tx);
    const flowBase = toBase(flowNative, tx.currency, baseCurrency, fxRates, tx.date);

    if (flowBase === null) {
      warnings.push(
        `חסר שער חליפין (${tx.currency} → ${baseCurrency}) בתאריך ${tx.date} — עסקה ${tx.id} לא נכללה בחישוב המזומן`,
      );
      continue;
    }
    cashBase += flowBase;
  }

  return cashBase;
}

export function calculateHoldings(input: CalculateHoldingsInput): PortfolioSummary {
  const { transactions, currentPrices, fxRates, baseCurrency } = input;
  const warnings: string[] = [];

  const priceBySecurity = new Map(currentPrices.map((p) => [p.securityId, p]));

  const bySecurity = new Map<string, EngineTransaction[]>();
  for (const tx of transactions) {
    if (!tx.securityId) continue;
    if (!bySecurity.has(tx.securityId)) bySecurity.set(tx.securityId, []);
    bySecurity.get(tx.securityId)!.push(tx);
  }

  const cashBase = computeCashBase(transactions, fxRates, baseCurrency, warnings);

  const holdings: HoldingResult[] = [];
  let investedCapitalBase = 0;
  let realizedPnLBaseTotal = 0;
  let unrealizedPnLBaseTotal = 0;
  let holdingsValueBase = 0;

  for (const [securityId, txs] of bySecurity) {
    const lots = processSecurityLots(securityId, txs, fxRates, baseCurrency, warnings);
    realizedPnLBaseTotal += lots.realizedPnLBase;

    const currentPrice = priceBySecurity.get(securityId);
    const missingPriceData = lots.quantity > 0 && !currentPrice;
    if (missingPriceData) {
      warnings.push(`לא נמצא מחיר עדכני עבור ${securityId}`);
    }

    let marketValue: number | null = null;
    let marketValueBase: number | null = null;
    let unrealizedPnLBase: number | null = null;
    let unrealizedPnLPct: number | null = null;

    if (currentPrice && lots.quantity > 0) {
      marketValue = lots.quantity * currentPrice.price;
      marketValueBase = toBase(
        marketValue,
        currentPrice.currency,
        baseCurrency,
        fxRates,
        isoToday(),
      );
      if (marketValueBase === null) {
        warnings.push(`חסר שער חליפין נוכחי עבור ${currentPrice.currency} → ${baseCurrency}`);
      } else {
        const costBasisBase = lots.quantity * lots.averageCostBase;
        unrealizedPnLBase = marketValueBase - costBasisBase;
        unrealizedPnLPct = costBasisBase !== 0 ? unrealizedPnLBase / costBasisBase : null;
        holdingsValueBase += marketValueBase;
        investedCapitalBase += costBasisBase;
        unrealizedPnLBaseTotal += unrealizedPnLBase;
      }
    }

    holdings.push({
      securityId,
      quantity: round(lots.quantity),
      averageCost: round(lots.averageCostNative),
      costCurrency: lots.costCurrency ?? baseCurrency,
      marketPrice: currentPrice?.price ?? null,
      marketValue: marketValue === null ? null : round(marketValue),
      marketValueBase: marketValueBase === null ? null : round(marketValueBase),
      weight: null, // filled in below once portfolioValueBase is known
      realizedPnLBase: round(lots.realizedPnLBase),
      unrealizedPnLBase: unrealizedPnLBase === null ? null : round(unrealizedPnLBase),
      unrealizedPnLPct,
      totalPnLBase:
        unrealizedPnLBase === null ? null : round(lots.realizedPnLBase + unrealizedPnLBase),
      missingPriceData,
    });
  }

  const portfolioValueBase = holdingsValueBase + cashBase;

  const holdingsWithWeight = holdings.map((h) => ({
    ...h,
    weight:
      h.marketValueBase !== null && portfolioValueBase !== 0
        ? h.marketValueBase / portfolioValueBase
        : null,
  }));

  return {
    baseCurrency,
    portfolioValueBase: round(portfolioValueBase),
    cashBase: round(cashBase),
    investedCapitalBase: round(investedCapitalBase),
    realizedPnLBase: round(realizedPnLBaseTotal),
    unrealizedPnLBase: round(unrealizedPnLBaseTotal),
    totalPnLBase: round(realizedPnLBaseTotal + unrealizedPnLBaseTotal),
    holdings: holdingsWithWeight.sort((a, b) => (b.marketValueBase ?? 0) - (a.marketValueBase ?? 0)),
    warnings,
  };
}

// Internal rounding only, to keep floating point noise out of test
// assertions and warnings — this is NOT the spec §54 display rounding,
// which happens purely in the UI layer via src/lib/format.ts. Precision
// here (1e-8) is far beyond currency display precision.
function round(value: number): number {
  return Math.round(value * 1e8) / 1e8;
}

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}
