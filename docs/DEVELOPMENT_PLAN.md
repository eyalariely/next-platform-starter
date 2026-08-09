# Smart Folio — Development Plan

Staged build order (spec §65). Each stage must pass `typecheck`, `lint`,
`test`, and `build` before the next stage starts.

- [x] **שלב 1 — תשתית**: Project Scaffold, Database, Auth, Navigation, Core Types
- [x] **שלב 2**: Portfolio + Transactions, Holdings Engine, Market Data Layer
- [x] **שלב 3**: Performance Engine, Dashboard, Benchmarks, Security Analysis (`/securities/[ticker]`)
- [ ] **שלב 4**: Risk Engine (Volatility, Drawdown, Concentration, Correlation, Risk Contribution, Risk Score)
- [ ] **שלב 5**: Risk Decision Support, What If, Simulator
- [ ] **שלב 6**: Risk Monitoring, Snapshots, Alerts, Trend
- [ ] **שלב 7**: Optimization, Scenario Center
- [ ] **שלב 8**: Watchlist, Investment Plan, Macro, Settings (advanced)
- [ ] **שלב 9**: AI Layer (Advisor, Security AI Summary)
- [ ] **שלב 10**: Testing (full unit/regression/E2E), Performance, Security, Deployment

## מצב שלב 1 (הושלם)

- Next.js 16 + TypeScript + Tailwind v4 scaffold
- Prisma schema מלא לפי §4 (Auth models + Portfolio/Security/Transaction/
  MarketPrice/ExchangeRate/Benchmark/Snapshots/Scenarios/Watchlist/
  InvestmentPlan/AlertPreference)
- Auth.js (Credentials + Prisma Adapter), middleware-based route
  protection, register/login/logout
- RTL layout, Sidebar (desktop), Bottom Nav + "עוד" sheet (mobile),
  User menu
- `env.example`, dev-only seed script
- Unit test scaffolding (Vitest) + first tests on `lib/format`
- E2E scaffolding (Playwright) + one smoke test
- כל ה-nav routes קיימים (Dashboard פונקציונלי מול ה-DB; השאר placeholders)

## מצב שלב 2 (הושלם)

- `MarketDataProvider` interface + Alpha Vantage adapter + dev-only mock
  (never used in production) — `src/lib/market/`
- `fx-engine.ts` (pure) + `portfolio-engine.ts` (pure): average cost,
  realized/unrealized P&L, cash, multi-currency, weights — 19 dedicated
  tests covering the full BUY/SELL/DEPOSIT/WITHDRAWAL/DIVIDEND/FEE
  lifecycle plus missing-price/missing-FX/oversell edge cases
- Security Master (`security.service.ts`): search + find-or-create,
  always validated against the provider, never fabricated
- Market data cache (`market-data.service.ts`): DB-backed with a quote
  TTL, degrades to stale cached data on provider failure/rate limit
  instead of crashing
- Portfolio CRUD + Transaction CRUD (services, Zod validators, server
  actions), both strictly scoped to `userId`; duplicate-transaction
  fingerprinting and a sell-exceeds-holdings guard, both pure and
  unit-tested independent of the DB
- Data pipeline orchestration (`holdings.service.ts`): Transactions →
  Security Master → Market Prices → FX Rates → Holdings Engine →
  Portfolio Summary, request-memoized via React's `cache()`
- UI: `/portfolio` (overview, create/edit/delete, allocation),
  `/transactions` (manual entry, edit, delete, filter, sort, search),
  `/transactions/import` (CSV/XLSX wizard: upload → mapping → preview →
  validate → confirm → import, with duplicate warnings), `/holdings`
  (sortable/searchable table), `/securities/[ticker]` (skeleton — full
  build in stage 3–4)
- Root `error.tsx` / `global-error.tsx` / `not-found.tsx` so no path
  crashes to a blank screen
- 78 unit tests total (Vitest), 3 E2E flows added (Playwright, not
  executed live in this sandbox — no DATABASE_URL available)

## מצב שלב 3 (הושלם)

- `performance-engine.ts` (pure): `buildPortfolioValueSeries` (historical,
  date-as-of valuation — never today's price for the past), `calculateReturns`
  (daily TWR — cash-flow-neutral subperiod return, geometrically linked;
  only DEPOSIT/WITHDRAWAL count as external cash flow, DIVIDEND is
  internal per spec §4/§37), `calculatePeriodReturns` (1D/1W/1M/3M/YTD/1Y/
  Since Inception, `null` when the series doesn't reach back far enough —
  a real bug here, caught by tests, is documented in the commit),
  `calculateMonthlyReturns`/`calculateAnnualReturns`
- Golden test (spec §39) passes exactly: a 5% day + a $20k mid-period
  deposit + a 0.952% day compounds to a 6.0% TWR, not the banned
  `(current − invested) / invested` 5% figure
- `benchmark-engine.ts` + `benchmark-config.ts` (SP500/NASDAQ100/TA125,
  proxied via SPY/QQQ/TA125.TA): reuses `calculateReturns`/
  `calculatePeriodReturns` directly (a benchmark return is the
  cash-flow-free special case of a portfolio's), "local" vs
  "portfolioCurrency" FX modes explicitly separated (spec §20)
- `performance-contribution.ts` (pure): per-security return % and share
  of total portfolio P/L — explicitly not Risk Contribution (spec §23)
- `performance.service.ts` / `benchmark.service.ts`: DB-backed pipeline
  (historical prices + FX via the existing market-data cache, extended
  with `getBenchmarkHistoricalPrices`), request-memoized via `cache()`
- `/dashboard` rebuilt per spec §41 order: value/P&L/TWR/YTD/cash/invested
  cards → performance chart (value/return toggle, 1M–ALL range) →
  portfolio-vs-benchmark chart with selector → period-return table → top
  positive/negative contributors → allocation by security/sector/currency
  → recent changes → data quality status. No Risk Score anywhere in it.
- `/securities/[ticker]` fully built per spec §42 order: header → current
  price (+ stale flag) → your position → P/L summary → price chart →
  period returns (incl. "since first purchase") → portfolio contribution
  → transactions → metadata (missing fields say "הנתון אינו זמין ממקור
  הנתונים", never blank/fabricated)
- Data quality status (`DataQualityStatus`): missing price/FX/benchmark
  warnings + a configurable stale-price threshold (`MARKET_DATA_STALE_DAYS`)
- 32 new unit tests (110 total, up from 78) — stage 2's 78 pass unchanged
  (regression clean); 2 new E2E specs (not executed live — no DB here)

## הבא בתור: שלב 4

Risk Engine (`portfolioRiskEngine.ts`): volatility, covariance/correlation
matrix, maximum drawdown, concentration (largest position, top-3, HHI),
risk contribution (RC%, RC − weight). Risk Score (0-100, modular
weighted breakdown, config in one file). No AI in the scoring itself.
