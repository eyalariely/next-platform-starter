import { auth } from "@/lib/auth";
import { listPortfoliosForUser, resolveActivePortfolio } from "@/services/portfolio.service";
import { getPortfolioSummary } from "@/services/holdings.service";
import { getPortfolioPerformance } from "@/services/performance.service";
import { getPortfolioVsBenchmark } from "@/services/benchmark.service";
import { db } from "@/lib/db";
import { DEFAULT_BENCHMARK_KEY } from "@/lib/financial/benchmark-config";
import { PageHeader } from "@/components/layout/page-header";
import { NoPortfolioEmptyState } from "@/components/portfolio/no-portfolio-empty-state";
import { PortfolioSwitcher } from "@/components/portfolio/portfolio-switcher";
import { StatCard } from "@/components/portfolio/stat-card";
import { AllocationList } from "@/components/portfolio/allocation-list";
import { PerformanceChart } from "@/components/dashboard/performance-chart";
import { BenchmarkChart } from "@/components/dashboard/benchmark-chart";
import { BenchmarkSelector } from "@/components/dashboard/benchmark-selector";
import { PeriodReturnsTable } from "@/components/dashboard/period-returns-table";
import { ContributorsList } from "@/components/dashboard/contributors-list";
import { RecentChanges } from "@/components/dashboard/recent-changes";
import { DataQualityStatus } from "@/components/dashboard/data-quality-status";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatPercent } from "@/lib/format";

const TOP_N = 8;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const session = await auth();
  const userId = session!.user.id;

  const portfolios = await listPortfoliosForUser(userId);
  if (portfolios.length === 0) {
    return (
      <div>
        <PageHeader title="לוח בקרה" />
        <NoPortfolioEmptyState />
      </div>
    );
  }

  const portfolio = await resolveActivePortfolio(userId, params.portfolioId);
  if (!portfolio) {
    return (
      <div>
        <PageHeader title="לוח בקרה" />
        <NoPortfolioEmptyState />
      </div>
    );
  }

  const benchmarkKey = params.benchmark ?? DEFAULT_BENCHMARK_KEY;

  const [summary, performance] = await Promise.all([
    getPortfolioSummary(userId, portfolio.id),
    getPortfolioPerformance(userId, portfolio.id),
  ]);
  const benchmarkComparison = await getPortfolioVsBenchmark(userId, portfolio.id, benchmarkKey);

  const heldPositions = summary.holdings.filter((h) => h.quantity > 0);

  const bySecurity = [...heldPositions].sort(
    (a, b) => (b.marketValueBase ?? 0) - (a.marketValueBase ?? 0),
  );
  const securityAllocation = bySecurity.slice(0, TOP_N).map((h) => ({
    label: h.security?.ticker ?? h.securityId,
    weight: h.weight ?? 0,
  }));
  const otherSecurityWeight = bySecurity.slice(TOP_N).reduce((s, h) => s + (h.weight ?? 0), 0);
  if (otherSecurityWeight > 0) securityAllocation.push({ label: "אחר", weight: otherSecurityWeight });

  const sectorWeights = new Map<string, number>();
  const currencyWeights = new Map<string, number>();
  for (const h of heldPositions) {
    const sector = h.security?.sector ?? "לא ידוע";
    sectorWeights.set(sector, (sectorWeights.get(sector) ?? 0) + (h.weight ?? 0));
    const currency = h.security?.currency ?? h.costCurrency;
    currencyWeights.set(currency, (currencyWeights.get(currency) ?? 0) + (h.weight ?? 0));
  }
  const sectorAllocation = [...sectorWeights.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, weight]) => ({ label, weight }));
  const currencyAllocation = [...currencyWeights.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, weight]) => ({ label, weight }));

  const sortedByContribution = [...performance.performanceBySecurity]
    .filter((r) => r.contributionToTotalPnL !== null)
    .sort((a, b) => (b.totalPnLBase ?? 0) - (a.totalPnLBase ?? 0));
  const topPositive = sortedByContribution.filter((r) => (r.totalPnLBase ?? 0) > 0).slice(0, 5);
  const topNegative = [...sortedByContribution]
    .filter((r) => (r.totalPnLBase ?? 0) < 0)
    .sort((a, b) => (a.totalPnLBase ?? 0) - (b.totalPnLBase ?? 0))
    .slice(0, 5);

  const recentTransactions = await db.transaction.findMany({
    where: { portfolioId: portfolio.id },
    include: { security: true },
    orderBy: { date: "desc" },
    take: 8,
  });

  const allWarnings = [...summary.warnings, ...performance.warnings, ...benchmarkComparison.warnings];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeader title="לוח בקרה" description={portfolio.name} />
        <PortfolioSwitcher portfolios={portfolios} activeId={portfolio.id} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="שווי תיק" value={formatCurrency(summary.portfolioValueBase, summary.baseCurrency)} />
        <StatCard
          label="רווח/הפסד כולל"
          tone={summary.totalPnLBase > 0 ? "gain" : summary.totalPnLBase < 0 ? "loss" : "neutral"}
          value={formatCurrency(summary.totalPnLBase, summary.baseCurrency)}
        />
        <StatCard
          label="TWR מאז ההקמה"
          tone={
            (performance.periodReturns.SINCE_INCEPTION ?? 0) > 0
              ? "gain"
              : (performance.periodReturns.SINCE_INCEPTION ?? 0) < 0
                ? "loss"
                : "neutral"
          }
          value={
            performance.periodReturns.SINCE_INCEPTION !== null
              ? formatPercent(performance.periodReturns.SINCE_INCEPTION, 1)
              : "—"
          }
        />
        <StatCard
          label="תשואה מתחילת השנה"
          tone={
            (performance.periodReturns.YTD ?? 0) > 0
              ? "gain"
              : (performance.periodReturns.YTD ?? 0) < 0
                ? "loss"
                : "neutral"
          }
          value={performance.periodReturns.YTD !== null ? formatPercent(performance.periodReturns.YTD, 1) : "—"}
        />
        <StatCard label="מזומן" value={formatCurrency(summary.cashBase, summary.baseCurrency)} />
        <StatCard label="הון מושקע" value={formatCurrency(summary.investedCapitalBase, summary.baseCurrency)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>ביצועי התיק</CardTitle>
        </CardHeader>
        <CardContent>
          <PerformanceChart series={performance.series} baseCurrency={summary.baseCurrency} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>תיק מול Benchmark</CardTitle>
          <BenchmarkSelector activeKey={benchmarkKey} />
        </CardHeader>
        <CardContent>
          <BenchmarkChart aligned={benchmarkComparison.aligned} benchmarkName={benchmarkComparison.benchmarkName} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>ביצועים לפי תקופה</CardTitle>
          </CardHeader>
          <CardContent>
            <PeriodReturnsTable rows={benchmarkComparison.comparison} benchmarkName={benchmarkComparison.benchmarkName} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>תורמים מובילים</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-2">
            <ContributorsList
              title="תרומה חיובית"
              tone="gain"
              baseCurrency={summary.baseCurrency}
              rows={topPositive.map((r) => ({ ticker: r.ticker, totalPnLBase: r.totalPnLBase }))}
            />
            <ContributorsList
              title="תרומה שלילית"
              tone="loss"
              baseCurrency={summary.baseCurrency}
              rows={topNegative.map((r) => ({ ticker: r.ticker, totalPnLBase: r.totalPnLBase }))}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>פיזור לפי נייר</CardTitle>
          </CardHeader>
          <CardContent>
            <AllocationList items={securityAllocation} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>פיזור לפי סקטור</CardTitle>
          </CardHeader>
          <CardContent>
            <AllocationList items={sectorAllocation} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>פיזור לפי מטבע</CardTitle>
          </CardHeader>
          <CardContent>
            <AllocationList items={currencyAllocation} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>שינויים אחרונים בתיק</CardTitle>
          </CardHeader>
          <CardContent>
            <RecentChanges
              rows={recentTransactions.map((tx) => ({
                id: tx.id,
                date: tx.date,
                type: tx.transactionType,
                ticker: tx.security?.ticker ?? null,
                quantity: tx.quantity?.toNumber() ?? null,
                price: tx.price?.toNumber() ?? null,
                currency: tx.currency,
              }))}
            />
          </CardContent>
        </Card>

        <DataQualityStatus warnings={allWarnings} staleTickers={
          summary.stalePriceSecurityIds
            .map((id) => summary.holdings.find((h) => h.securityId === id)?.security?.ticker)
            .filter((t): t is string => Boolean(t))
        } />
      </div>
    </div>
  );
}
