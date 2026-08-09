import Link from "next/link";
import { notFound } from "next/navigation";

import { auth } from "@/lib/auth";
import { listPortfoliosForUser, resolveActivePortfolio } from "@/services/portfolio.service";
import { getSecurityAnalysis } from "@/services/security-analysis.service";
import { PageHeader } from "@/components/layout/page-header";
import { PortfolioSwitcher } from "@/components/portfolio/portfolio-switcher";
import { StatCard } from "@/components/portfolio/stat-card";
import { SecurityPriceChart } from "@/components/security/security-price-chart";
import { SecurityPeriodReturns } from "@/components/security/security-period-returns";
import { TRANSACTION_TYPE_LABELS } from "@/components/transactions/transaction-type-labels";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Numeric } from "@/components/ui/numeric";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate, formatNumber, formatPercent } from "@/lib/format";

export default async function SecurityPage({
  params,
  searchParams,
}: {
  params: Promise<{ ticker: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { ticker } = await params;
  const query = await searchParams;
  const session = await auth();
  const userId = session!.user.id;

  const portfolios = await listPortfoliosForUser(userId);
  const activePortfolio =
    portfolios.length > 0 ? await resolveActivePortfolio(userId, query.portfolioId) : null;

  const analysis = await getSecurityAnalysis(userId, activePortfolio?.id ?? null, ticker);
  if (!analysis) notFound();

  const { security, currentPrice, dailyChangePct, position } = analysis;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeader
          title={security.name}
          description={`${security.ticker} · ${security.exchange} · ${security.currency}`}
        />
        {portfolios.length > 1 && activePortfolio ? (
          <PortfolioSwitcher portfolios={portfolios} activeId={activePortfolio.id} />
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="מחיר נוכחי"
          value={
            currentPrice
              ? formatCurrency(currentPrice.price, currentPrice.currency)
              : "לא זמין"
          }
          secondary={currentPrice?.stale ? "מחיר לא עדכני" : undefined}
        />
        <StatCard
          label="שינוי יומי"
          tone={dailyChangePct === null ? "neutral" : dailyChangePct > 0 ? "gain" : dailyChangePct < 0 ? "loss" : "neutral"}
          value={dailyChangePct !== null ? formatPercent(dailyChangePct, 2) : "—"}
        />
        {position ? (
          <>
            <StatCard
              label="שווי אחזקה בתיק"
              value={position.marketValueBase !== null ? formatCurrency(position.marketValueBase, activePortfolio!.baseCurrency) : "—"}
              secondary={position.weight !== null ? `${formatPercent(position.weight, 1)} מהתיק` : undefined}
            />
            <StatCard
              label="רווח/הפסד כולל"
              tone={(position.totalPnLBase ?? 0) > 0 ? "gain" : (position.totalPnLBase ?? 0) < 0 ? "loss" : "neutral"}
              value={position.totalPnLBase !== null ? formatCurrency(position.totalPnLBase, activePortfolio!.baseCurrency) : "—"}
            />
          </>
        ) : (
          <div className="sm:col-span-2 flex items-center rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            הנייר אינו מוחזק כרגע {activePortfolio ? `בתיק "${activePortfolio.name}"` : "באף תיק"}.
          </div>
        )}
      </div>

      {position ? (
        <Card>
          <CardHeader>
            <CardTitle>האחזקה שלך</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">כמות</span>
              <Numeric>{formatNumber(position.quantity)}</Numeric>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">עלות ממוצעת</span>
              <Numeric>{formatNumber(position.averageCost, { maximumFractionDigits: 4 })}</Numeric>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">רווח ממומש</span>
              <Numeric className={position.realizedPnLBase > 0 ? "text-gain" : position.realizedPnLBase < 0 ? "text-loss" : ""}>
                {formatCurrency(position.realizedPnLBase, activePortfolio!.baseCurrency)}
              </Numeric>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">רווח לא ממומש</span>
              <Numeric
                className={
                  position.unrealizedPnLBase === null
                    ? ""
                    : position.unrealizedPnLBase > 0
                      ? "text-gain"
                      : position.unrealizedPnLBase < 0
                        ? "text-loss"
                        : ""
                }
              >
                {position.unrealizedPnLBase !== null
                  ? formatCurrency(position.unrealizedPnLBase, activePortfolio!.baseCurrency)
                  : "—"}
              </Numeric>
            </div>
            {analysis.contributionToTotalPnL !== null ? (
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">תרומה לרווח/הפסד הכולל</span>
                <Numeric
                  className={analysis.contributionToTotalPnL > 0 ? "text-gain" : analysis.contributionToTotalPnL < 0 ? "text-loss" : ""}
                >
                  {formatPercent(analysis.contributionToTotalPnL, 1)}
                </Numeric>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>גרף מחיר</CardTitle>
        </CardHeader>
        <CardContent>
          <SecurityPriceChart series={analysis.priceSeries} currency={security.currency} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>ביצועים לפי תקופה</CardTitle>
        </CardHeader>
        <CardContent>
          <SecurityPeriodReturns
            periodReturns={analysis.periodReturns}
            sinceFirstPurchase={analysis.sinceFirstPurchaseReturn}
          />
        </CardContent>
      </Card>

      {analysis.transactions.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>עסקאות בנייר זה</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>תאריך</TableHead>
                  <TableHead>סוג</TableHead>
                  <TableHead>כמות</TableHead>
                  <TableHead>מחיר</TableHead>
                  <TableHead>מטבע</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analysis.transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell><Numeric>{formatDate(tx.date)}</Numeric></TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {TRANSACTION_TYPE_LABELS[tx.type as keyof typeof TRANSACTION_TYPE_LABELS] ?? tx.type}
                      </Badge>
                    </TableCell>
                    <TableCell><Numeric>{tx.quantity !== null ? formatNumber(tx.quantity) : "—"}</Numeric></TableCell>
                    <TableCell><Numeric>{tx.price !== null ? formatNumber(tx.price, { maximumFractionDigits: 4 }) : "—"}</Numeric></TableCell>
                    <TableCell><Numeric>{tx.currency}</Numeric></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>פרטי נייר</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <MetaField label="סוג נייר" value={security.securityType} />
          <MetaField label="סקטור" value={security.sector} />
          <MetaField label="תעשייה" value={security.industry} />
          <MetaField label="מדינה" value={security.country} />
          <MetaField label="ISIN" value={security.isin} numeric />
        </CardContent>
      </Card>

      {portfolios.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          <Link href="/portfolio" className="text-primary hover:underline">
            צור תיק השקעות
          </Link>{" "}
          כדי לעקוב אחר אחזקה בנייר זה.
        </p>
      ) : null}
    </div>
  );
}

function MetaField({ label, value, numeric }: { label: string; value: string | null; numeric?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      {value ? (
        <span className={numeric ? "ltr-numeric" : undefined}>{value}</span>
      ) : (
        <span className="text-sm text-muted-foreground">הנתון אינו זמין ממקור הנתונים.</span>
      )}
    </div>
  );
}
