# Smart Folio — Development Plan

Staged build order (spec §65). Each stage must pass `typecheck`, `lint`,
`test`, and `build` before the next stage starts.

- [x] **שלב 1 — תשתית**: Project Scaffold, Database, Auth, Navigation, Core Types
- [x] **שלב 2**: Portfolio + Transactions, Holdings Engine, Market Data Layer
- [ ] **שלב 3**: Performance Engine, Dashboard, Benchmarks
- [ ] **שלב 4**: Security Analysis (`/securities/[ticker]`)
- [ ] **שלב 5**: Risk Engine, Risk Score
- [ ] **שלב 6**: Risk Decision Support, What If, Simulator
- [ ] **שלב 7**: Risk Monitoring, Snapshots, Alerts, Trend
- [ ] **שלב 8**: Optimization, Scenario Center
- [ ] **שלב 9**: Watchlist, Investment Plan, Macro, Settings (advanced)
- [ ] **שלב 10**: AI Layer (Advisor, Security AI Summary)
- [ ] **שלב 11**: Testing (full unit/regression/E2E), Performance, Security, Deployment

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

## הבא בתור: שלב 3

Performance Engine (`performanceEngine.ts`): historical portfolio value
series, TWR (cash-flow neutral), daily/cumulative/monthly/annual returns.
Benchmark Engine + config (S&P 500 / NASDAQ 100 / TA-125). Upgraded
`/dashboard` and a fully built `/securities/[ticker]`.
