import { z } from "zod";

// A pragmatic real-world currency code list covering the currencies the
// rest of the spec names explicitly (USD/ILS/EUR benchmarks, macro pairs)
// plus other majors. Not exhaustive by design — extending it is a
// one-line change, and rejecting an unknown code is safer than silently
// accepting a typo'd currency that FX lookups can never resolve.
export const SUPPORTED_CURRENCIES = [
  "USD",
  "ILS",
  "EUR",
  "GBP",
  "JPY",
  "CHF",
  "CAD",
  "AUD",
] as const;

export const portfolioSchema = z.object({
  name: z.string().trim().min(1, "שם התיק נדרש").max(100, "שם התיק ארוך מדי"),
  baseCurrency: z.enum(SUPPORTED_CURRENCIES, {
    message: "מטבע בסיס לא נתמך",
  }),
});

export type PortfolioInput = z.infer<typeof portfolioSchema>;
