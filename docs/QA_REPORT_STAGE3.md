# Smart Folio — Stage 3 Final QA Report

Per spec §49. All automated checks below were actually run in this
environment; UI/mobile/RTL rows were verified by code review (no live DB
in this sandbox — see "Known limitations" in README.md).

| Test | Expected | Actual | Result |
|---|---|---|---|
| Holdings regression (stage 2) | 19 portfolio-engine tests still pass unchanged | 19/19 pass | ✅ PASS |
| Cash regression (stage 2) | DEPOSIT/WITHDRAWAL/BUY/SELL/DIVIDEND/FEE cash math unchanged | All stage-2 cash tests pass | ✅ PASS |
| Average Cost regression (stage 2) | Weighted average cost math unchanged | All stage-2 avg-cost tests pass | ✅ PASS |
| TWR — no cash flow | TWR = simple return | `toBeCloseTo(0.10, 10)` | ✅ PASS |
| TWR — with deposit | Mid-period deposit neutralized; golden scenario (§39) → 6.0% TWR, not 5% | `cumulativeReturn ≈ 0.06` exactly | ✅ PASS |
| TWR — with withdrawal | Mid-period withdrawal neutralized (no false −30%) | `dailyReturn ≈ 0` | ✅ PASS |
| Dividend | Increases cash/value, not counted as external cash flow | `externalCashFlowBase === 0`, value +50 | ✅ PASS |
| Fee | Reduces portfolio value as a real cost | value −25 exactly | ✅ PASS |
| FX | Historical rate used, no USD assumption, missing FX ⇒ warning not fabricated 0 | 6 dedicated FX tests pass | ✅ PASS |
| Benchmark | Isolated engine, reuses same TWR math as portfolio | 7 benchmark-engine tests pass | ✅ PASS |
| Benchmark FX (local vs portfolioCurrency) | Two modes give different, explicit answers | `not.toBeCloseTo` assertion passes | ✅ PASS |
| Monthly return | One return per calendar month, `null` for the first (no prior month) | `monthly[0].return === null`, `monthly[1] ≈ 0.10` | ✅ PASS |
| Annual return | One return per calendar year | `annual[1].return ≈ 0.15` | ✅ PASS |
| Period returns — insufficient history | `null`, never a fabricated number (spec §8) | Regression-caught bug fixed; `1Y === null` when series is 2 days old | ✅ PASS |
| Security page | Renders header/price/position/chart/periods/transactions/metadata; deep-links without 404 | Code review + typecheck/build; E2E spec written | ✅ PASS (build), ⚠️ E2E not run live |
| Dashboard | All §41 sections present, no Risk Score | Code review; build succeeds | ✅ PASS |
| Mobile | Bottom nav + responsive grids (`sm:`/`lg:` breakpoints) on all new pages | Code review (Tailwind responsive classes throughout) | ✅ PASS (visual QA not run — no browser session) |
| RTL | `dir="rtl"` inherited from root layout; all numbers/tickers/dates wrapped `.ltr-numeric`; charts use `dir="ltr"` internally | Code review | ✅ PASS |
| Build | `next build` succeeds, all routes present | `npm run build` | ✅ PASS |
| Typecheck | `tsc --noEmit` clean | `npm run typecheck` | ✅ PASS |
| Lint | `eslint` clean | `npm run lint` | ✅ PASS |
| Unit tests | All pass | 110/110 (78 stage 1-2 + 32 new) | ✅ PASS |

## Golden test detail (spec §39)

```
Day 1: Portfolio = 100,000            (baseline)
Day 2: Value = 105,000                 → daily return = +5.00%
Day 3: Deposit 20,000, End = 126,000   → daily return = (126,000−20,000)/105,000−1 = +0.952%

TWR = 1.05 × 1.00952... − 1 = 6.00% exactly
Banned formula (current−invested)/invested = (126,000−120,000)/120,000 = 5.00% ≠ TWR
```
Both assertions pass in `tests/unit/performance-engine.test.ts`.

## A real bug this QA pass caught and fixed

`calculatePeriodReturns`'s bounded periods (1D/1W/1M/3M/1Y, and YTD when
the portfolio predates this year) initially fell back to a 0%-baseline
"since inception" factor whenever the exact lookback date wasn't found in
the series — silently returning a plausible-looking number instead of
`null` for periods the series doesn't actually reach back far enough for
(a direct violation of spec §8). A dedicated test
(`calculatePeriodReturns > returns null for periods the series doesn't
reach back far enough for`) caught it; fixed by adding a `boundedPeriodReturn`
helper that explicitly checks the lookback target against the series'
start date before ever computing a number.

## Known gaps in this QA pass

- E2E specs (Playwright) are written for both the stage-2 and stage-3
  flows but were not executed live — this sandbox has no `DATABASE_URL`.
- Mobile/RTL/visual QA (§45) was done by code review of the Tailwind
  classes and RTL wrapper usage, not a live browser render.
