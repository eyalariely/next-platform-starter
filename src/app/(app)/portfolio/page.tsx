import Link from "next/link";
import { TriangleAlert } from "lucide-react";

import { auth } from "@/lib/auth";
import { listPortfoliosForUser, resolveActivePortfolio } from "@/services/portfolio.service";
import { getPortfolioSummary } from "@/services/holdings.service";
import { PageHeader } from "@/components/layout/page-header";
import { NoPortfolioEmptyState } from "@/components/portfolio/no-portfolio-empty-state";
import { PortfolioSwitcher } from "@/components/portfolio/portfolio-switcher";
import { PortfolioFormDialog } from "@/components/portfolio/portfolio-form-dialog";
import { DeletePortfolioButton } from "@/components/portfolio/delete-portfolio-button";
import { StatCard } from "@/components/portfolio/stat-card";
import { AllocationList } from "@/components/portfolio/allocation-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Numeric } from "@/components/ui/numeric";
import { formatCurrency, formatPercent } from "@/lib/format";

const TOP_N = 8;

export default async function PortfolioOverviewPage({
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
        <PageHeader title="תיק השקעות" />
        <NoPortfolioEmptyState />
      </div>
    );
  }

  const portfolio = await resolveActivePortfolio(userId, params.portfolioId);
  if (!portfolio) {
    return (
      <div>
        <PageHeader title="תיק השקעות" />
        <NoPortfolioEmptyState />
      </div>
    );
  }

  const summary = await getPortfolioSummary(userId, portfolio.id);
  const heldPositions = summary.holdings.filter((h) => h.quantity > 0);

  const bySecurity = [...heldPositions]
    .sort((a, b) => (b.marketValueBase ?? 0) - (a.marketValueBase ?? 0));
  const securityAllocation = bySecurity.slice(0, TOP_N).map((h) => ({
    label: h.security?.ticker ?? h.securityId,
    weight: h.weight ?? 0,
  }));
  const otherWeight = bySecurity.slice(TOP_N).reduce((sum, h) => sum + (h.weight ?? 0), 0);
  if (otherWeight > 0) securityAllocation.push({ label: "אחר", weight: otherWeight });

  const sectorWeights = new Map<string, number>();
  for (const h of heldPositions) {
    const sector = h.security?.sector ?? "לא ידוע";
    sectorWeights.set(sector, (sectorWeights.get(sector) ?? 0) + (h.weight ?? 0));
  }
  const sectorAllocation = [...sectorWeights.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, weight]) => ({ label, weight }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeader title={portfolio.name} description={`מטבע בסיס: ${portfolio.baseCurrency}`} />
        <div className="flex items-center gap-2">
          <PortfolioSwitcher portfolios={portfolios} activeId={portfolio.id} />
          <PortfolioFormDialog portfolio={portfolio} />
          <DeletePortfolioButton portfolioId={portfolio.id} portfolioName={portfolio.name} />
        </div>
      </div>

      {summary.warnings.length > 0 ? (
        <Card className="border-warning/40 bg-warning/10">
          <CardContent className="flex flex-col gap-1 p-4 text-sm">
            <div className="flex items-center gap-2 font-medium text-warning-foreground">
              <TriangleAlert className="size-4" aria-hidden="true" />
              נמצאו פערי נתונים
            </div>
            <ul className="list-inside list-disc text-muted-foreground">
              {summary.warnings.slice(0, 5).map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="שווי תיק"
          value={formatCurrency(summary.portfolioValueBase, summary.baseCurrency)}
        />
        <StatCard label="מזומן" value={formatCurrency(summary.cashBase, summary.baseCurrency)} />
        <StatCard
          label="הון מושקע"
          value={formatCurrency(summary.investedCapitalBase, summary.baseCurrency)}
        />
        <StatCard
          label="רווח/הפסד כולל"
          tone={summary.totalPnLBase > 0 ? "gain" : summary.totalPnLBase < 0 ? "loss" : "neutral"}
          value={formatCurrency(summary.totalPnLBase, summary.baseCurrency)}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>אחזקות מובילות</CardTitle>
          </CardHeader>
          <CardContent>
            {bySecurity.length === 0 ? (
              <p className="text-sm text-muted-foreground">אין עדיין אחזקות בתיק</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {bySecurity.slice(0, 5).map((h) => (
                  <li key={h.securityId} className="flex items-center justify-between text-sm">
                    <Link
                      href={`/securities/${h.security?.ticker ?? h.securityId}`}
                      className="ltr-numeric font-medium text-primary hover:underline"
                    >
                      {h.security?.ticker ?? h.securityId}
                    </Link>
                    <div className="flex items-center gap-3">
                      <Numeric className="text-muted-foreground">{formatPercent(h.weight ?? 0, 1)}</Numeric>
                      <Numeric>
                        {h.marketValueBase !== null
                          ? formatCurrency(h.marketValueBase, summary.baseCurrency)
                          : "—"}
                      </Numeric>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

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
      </div>
    </div>
  );
}
