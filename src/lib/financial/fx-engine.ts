/**
 * FX Engine (spec §8) — pure currency-conversion math only. No fetching,
 * no DB access, no assumed base currency (never assumes USD — every
 * conversion is explicit about `from`/`to`).
 *
 * Historical rates are supplied by the caller (src/services/fx.service.ts
 * loads them from the ExchangeRate table / MarketDataProvider) as a flat
 * list; this module never talks to Prisma or a provider directly.
 */

export interface FxRatePoint {
  baseCurrency: string;
  quoteCurrency: string;
  /** ISO date, YYYY-MM-DD. */
  date: string;
  /** 1 unit of baseCurrency = `rate` units of quoteCurrency. */
  rate: number;
}

/** Raw multiply — kept separate so callers with an already-resolved rate
 *  (e.g. a live quote) don't need to build an FxRatePoint just to convert. */
export function convertCurrency(amount: number, rate: number): number {
  return amount * rate;
}

/**
 * Resolves the `from` -> `to` rate on `date` out of a pre-loaded rate
 * table. Never throws and never invents a number: returns `null` when
 * nothing usable is available so callers can surface "missing FX" (spec
 * §18) instead of silently producing a wrong figure.
 *
 * Resolution order:
 *  1. same currency => 1
 *  2. exact date, stored as `from -> to`
 *  3. exact date, stored as the inverse pair `to -> from` (inverted)
 *  4. most recent point on/before `date`, direct or inverse
 */
export function getHistoricalFxRate(
  rates: readonly FxRatePoint[],
  from: string,
  to: string,
  date: string,
): number | null {
  if (from === to) return 1;

  const candidates = rates.filter(
    (r) =>
      (r.baseCurrency === from && r.quoteCurrency === to) ||
      (r.baseCurrency === to && r.quoteCurrency === from),
  );
  if (candidates.length === 0) return null;

  const asRate = (point: FxRatePoint) =>
    point.baseCurrency === from ? point.rate : 1 / point.rate;

  const exact = candidates.find((r) => r.date === date);
  if (exact) return asRate(exact);

  const onOrBefore = candidates
    .filter((r) => r.date <= date)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  return onOrBefore.length > 0 ? asRate(onOrBefore[0]) : null;
}

/**
 * Converts `amount` (in `currency`) into the portfolio's `baseCurrency` as
 * of `date`. Returns `null` — never a guessed value — when no FX data
 * covers the pair.
 */
export function normalizeToPortfolioCurrency(
  amount: number,
  currency: string,
  baseCurrency: string,
  rates: readonly FxRatePoint[],
  date: string,
): number | null {
  const rate = getHistoricalFxRate(rates, currency, baseCurrency, date);
  return rate === null ? null : convertCurrency(amount, rate);
}
