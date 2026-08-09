# Smart Folio — Development Plan

Staged build order (spec §65). Each stage must pass `typecheck`, `lint`,
`test`, and `build` before the next stage starts.

- [x] **שלב 1 — תשתית**: Project Scaffold, Database, Auth, Navigation, Core Types
- [ ] **שלב 2**: Portfolio + Transactions, Holdings Engine, Market Data Layer
- [ ] **שלב 3**: Performance Engine, Dashboard, Holdings
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

## הבא בתור: שלב 2

Portfolio + Transactions CRUD, CSV/Excel import with Preview & validation
(§5), `MarketDataProvider` interface (§6), and the pure `portfolioEngine.ts`
(§7) — holdings, average cost, weights, P/L, multi-currency conversion via
historical exchange rates.
