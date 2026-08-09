import Link from "next/link";
import { ListTree } from "lucide-react";

import { auth } from "@/lib/auth";
import { listPortfoliosForUser, resolveActivePortfolio } from "@/services/portfolio.service";
import { getPortfolioSummary, type HoldingWithSecurity } from "@/services/holdings.service";
import { PageHeader } from "@/components/layout/page-header";
import { NoPortfolioEmptyState } from "@/components/portfolio/no-portfolio-empty-state";
import { PortfolioSwitcher } from "@/components/portfolio/portfolio-switcher";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Numeric } from "@/components/ui/numeric";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SortableHeader } from "@/components/ui/sortable-header";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";

type SortKey = "ticker" | "quantity" | "marketValue" | "weight" | "unrealizedPnL";

function sortHoldings(
  holdings: HoldingWithSecurity[],
  sortBy: SortKey,
  sortDir: "asc" | "desc",
): HoldingWithSecurity[] {
  const dir = sortDir === "asc" ? 1 : -1;
  return [...holdings].sort((a, b) => {
    switch (sortBy) {
      case "ticker":
        return dir * (a.security?.ticker ?? "").localeCompare(b.security?.ticker ?? "");
      case "quantity":
        return dir * (a.quantity - b.quantity);
      case "weight":
        return dir * ((a.weight ?? -1) - (b.weight ?? -1));
      case "unrealizedPnL":
        return dir * ((a.unrealizedPnLBase ?? -Infinity) - (b.unrealizedPnLBase ?? -Infinity));
      case "marketValue":
      default:
        return dir * ((a.marketValueBase ?? -1) - (b.marketValueBase ?? -1));
    }
  });
}

export default async function HoldingsPage({
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
        <PageHeader title="אחזקות" />
        <NoPortfolioEmptyState />
      </div>
    );
  }

  const portfolio = await resolveActivePortfolio(userId, params.portfolioId);
  if (!portfolio) {
    return (
      <div>
        <PageHeader title="אחזקות" />
        <NoPortfolioEmptyState />
      </div>
    );
  }

  const summary = await getPortfolioSummary(userId, portfolio.id);
  let holdings = summary.holdings.filter((h) => h.quantity > 0);

  const search = params.search?.trim().toLowerCase();
  if (search) {
    holdings = holdings.filter(
      (h) =>
        h.security?.ticker.toLowerCase().includes(search) ||
        h.security?.name.toLowerCase().includes(search) ||
        h.security?.sector?.toLowerCase().includes(search),
    );
  }

  const sortBy = (params.sortBy as SortKey) ?? "marketValue";
  const sortDir = (params.sortDir as "asc" | "desc") ?? "desc";
  holdings = sortHoldings(holdings, sortBy, sortDir);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeader title="אחזקות" description={portfolio.name} />
        <PortfolioSwitcher portfolios={portfolios} activeId={portfolio.id} />
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <form action="" className="w-full max-w-sm">
            <input type="hidden" name="portfolioId" value={portfolio.id} />
            <Input name="search" placeholder="חיפוש לפי טיקר, שם או סקטור..." defaultValue={params.search ?? ""} />
          </form>

          {holdings.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <ListTree className="size-8 text-muted-foreground" aria-hidden="true" />
              <p className="font-medium">
                {search ? "לא נמצאו אחזקות התואמות את החיפוש" : "אין עדיין אחזקות בתיק"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead><SortableHeader label="טיקר" sortKey="ticker" /></TableHead>
                  <TableHead>שם</TableHead>
                  <TableHead><SortableHeader label="כמות" sortKey="quantity" /></TableHead>
                  <TableHead>עלות ממוצעת</TableHead>
                  <TableHead>מחיר נוכחי</TableHead>
                  <TableHead><SortableHeader label="שווי" sortKey="marketValue" defaultDir="desc" /></TableHead>
                  <TableHead><SortableHeader label="משקל" sortKey="weight" defaultDir="desc" /></TableHead>
                  <TableHead><SortableHeader label="רווח/הפסד" sortKey="unrealizedPnL" defaultDir="desc" /></TableHead>
                  <TableHead>רווח %</TableHead>
                  <TableHead>מטבע</TableHead>
                  <TableHead>סקטור</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {holdings.map((h) => (
                  <TableRow key={h.securityId}>
                    <TableCell>
                      <Link
                        href={`/securities/${h.security?.ticker ?? h.securityId}`}
                        className="ltr-numeric font-medium text-primary hover:underline"
                      >
                        {h.security?.ticker ?? h.securityId}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-48 truncate">{h.security?.name ?? "—"}</TableCell>
                    <TableCell><Numeric>{formatNumber(h.quantity)}</Numeric></TableCell>
                    <TableCell>
                      <Numeric>{formatNumber(h.averageCost, { maximumFractionDigits: 4 })}</Numeric>
                    </TableCell>
                    <TableCell>
                      {h.marketPrice !== null ? (
                        <Numeric>{formatNumber(h.marketPrice, { maximumFractionDigits: 4 })}</Numeric>
                      ) : (
                        <Badge variant="warning">מחיר לא זמין</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Numeric>
                        {h.marketValueBase !== null
                          ? formatCurrency(h.marketValueBase, summary.baseCurrency)
                          : "—"}
                      </Numeric>
                    </TableCell>
                    <TableCell>
                      <Numeric>{h.weight !== null ? formatPercent(h.weight, 1) : "—"}</Numeric>
                    </TableCell>
                    <TableCell>
                      <Numeric
                        className={
                          h.unrealizedPnLBase === null
                            ? ""
                            : h.unrealizedPnLBase > 0
                              ? "text-gain"
                              : h.unrealizedPnLBase < 0
                                ? "text-loss"
                                : ""
                        }
                      >
                        {h.unrealizedPnLBase !== null
                          ? formatCurrency(h.unrealizedPnLBase, summary.baseCurrency)
                          : "—"}
                      </Numeric>
                    </TableCell>
                    <TableCell>
                      <Numeric
                        className={
                          h.unrealizedPnLPct === null
                            ? ""
                            : h.unrealizedPnLPct > 0
                              ? "text-gain"
                              : h.unrealizedPnLPct < 0
                                ? "text-loss"
                                : ""
                        }
                      >
                        {h.unrealizedPnLPct !== null ? formatPercent(h.unrealizedPnLPct, 1) : "—"}
                      </Numeric>
                    </TableCell>
                    <TableCell><Numeric>{h.security?.currency ?? h.costCurrency}</Numeric></TableCell>
                    <TableCell>{h.security?.sector ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
