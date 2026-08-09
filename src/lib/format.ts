/**
 * Presentation-only formatting helpers.
 *
 * Rule (spec §54/§56): never round mid-calculation — financial engines work in
 * full-precision decimals. Rounding happens here, at the UI boundary, only.
 * Tickers, numbers, percentages, currency and dates always render left-to-right
 * even inside the RTL document (spec §2) — pair these with the `.ltr-numeric`
 * class (or the <Numeric> component) at the call site.
 */

const DEFAULT_LOCALE = "en-US";

export function formatCurrency(
  value: number,
  currency: string,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(DEFAULT_LOCALE, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
    ...options,
  }).format(value);
}

export function formatPercent(
  decimalValue: number,
  fractionDigits = 2,
): string {
  return new Intl.NumberFormat(DEFAULT_LOCALE, {
    style: "percent",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
    signDisplay: "auto",
  }).format(decimalValue);
}

export function formatNumber(
  value: number,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(DEFAULT_LOCALE, options).format(value);
}

/**
 * Renders a date stored in UTC in the given IANA time zone (defaults to the
 * runtime's local zone, i.e. the user's browser timezone on the client).
 */
export function formatDate(
  value: Date | string,
  options?: Intl.DateTimeFormatOptions,
): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    ...options,
  }).format(date);
}

export function formatTicker(ticker: string): string {
  return ticker.toUpperCase();
}
