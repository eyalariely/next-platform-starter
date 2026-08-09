import Link from "next/link";
import { FileSpreadsheet, Pencil, Receipt } from "lucide-react";

import { auth } from "@/lib/auth";
import { listPortfoliosForUser, resolveActivePortfolio } from "@/services/portfolio.service";
import { listTransactionsForPortfolio } from "@/services/transaction.service";
import type { TransactionType } from "@prisma/client";
import { PageHeader } from "@/components/layout/page-header";
import { NoPortfolioEmptyState } from "@/components/portfolio/no-portfolio-empty-state";
import { PortfolioSwitcher } from "@/components/portfolio/portfolio-switcher";
import { TransactionFormDialog } from "@/components/transactions/transaction-form-dialog";
import { TransactionFilters } from "@/components/transactions/transaction-filters";
import { DeleteTransactionButton } from "@/components/transactions/delete-transaction-button";
import { TRANSACTION_TYPE_LABELS } from "@/components/transactions/transaction-type-labels";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Numeric } from "@/components/ui/numeric";
import { formatDate, formatNumber } from "@/lib/format";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SortableHeader } from "@/components/ui/sortable-header";

export default async function TransactionsPage({
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
        <PageHeader title="עסקאות" />
        <NoPortfolioEmptyState />
      </div>
    );
  }

  const portfolio = await resolveActivePortfolio(userId, params.portfolioId);
  if (!portfolio) {
    return (
      <div>
        <PageHeader title="עסקאות" />
        <NoPortfolioEmptyState />
      </div>
    );
  }

  const transactions = await listTransactionsForPortfolio(userId, portfolio.id, {
    type: params.type as TransactionType | undefined,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    search: params.search,
    sortBy: params.sortBy as "date" | "type" | "quantity" | "price" | undefined,
    sortDir: params.sortDir as "asc" | "desc" | undefined,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeader title="עסקאות" description={portfolio.name} />
        <div className="flex items-center gap-2">
          <PortfolioSwitcher portfolios={portfolios} activeId={portfolio.id} />
          <Button variant="outline" size="sm" asChild>
            <Link href={`/transactions/import?portfolioId=${portfolio.id}`}>
              <FileSpreadsheet />
              ייבוא CSV/XLSX
            </Link>
          </Button>
          <TransactionFormDialog portfolioId={portfolio.id} />
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <TransactionFilters />

          {transactions.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <Receipt className="size-8 text-muted-foreground" aria-hidden="true" />
              <p className="font-medium">
                {params.search || params.type || params.dateFrom || params.dateTo
                  ? "לא נמצאו עסקאות התואמות את הסינון"
                  : "התיק עדיין ריק"}
              </p>
              {!params.search && !params.type && !params.dateFrom && !params.dateTo ? (
                <p className="max-w-sm text-sm text-muted-foreground">
                  הוסף עסקה ידנית או ייבא קובץ CSV/XLSX כדי להתחיל.
                </p>
              ) : null}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead><SortableHeader label="תאריך" sortKey="date" defaultDir="desc" /></TableHead>
                  <TableHead><SortableHeader label="סוג" sortKey="type" /></TableHead>
                  <TableHead>נייר</TableHead>
                  <TableHead><SortableHeader label="כמות" sortKey="quantity" /></TableHead>
                  <TableHead><SortableHeader label="מחיר" sortKey="price" /></TableHead>
                  <TableHead>מטבע</TableHead>
                  <TableHead>עמלה</TableHead>
                  <TableHead>מס</TableHead>
                  <TableHead>הערות</TableHead>
                  <TableHead className="text-end">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell>
                      <Numeric>{formatDate(tx.date)}</Numeric>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{TRANSACTION_TYPE_LABELS[tx.transactionType]}</Badge>
                    </TableCell>
                    <TableCell>
                      {tx.security ? (
                        <Link
                          href={`/securities/${tx.security.ticker}`}
                          className="ltr-numeric font-medium text-primary hover:underline"
                        >
                          {tx.security.ticker}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Numeric>{tx.quantity ? formatNumber(tx.quantity.toNumber()) : "—"}</Numeric>
                    </TableCell>
                    <TableCell>
                      <Numeric>{tx.price ? formatNumber(tx.price.toNumber(), { maximumFractionDigits: 4 }) : "—"}</Numeric>
                    </TableCell>
                    <TableCell>
                      <Numeric>{tx.currency}</Numeric>
                    </TableCell>
                    <TableCell>
                      <Numeric>{formatNumber(tx.fees.toNumber())}</Numeric>
                    </TableCell>
                    <TableCell>
                      <Numeric>{formatNumber(tx.tax.toNumber())}</Numeric>
                    </TableCell>
                    <TableCell className="max-w-40 truncate text-muted-foreground">
                      {tx.notes ?? ""}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <TransactionFormDialog
                          portfolioId={portfolio.id}
                          transaction={{
                            id: tx.id,
                            type: tx.transactionType,
                            date: tx.date.toISOString().slice(0, 10),
                            quantity: tx.quantity?.toNumber() ?? null,
                            price: tx.price?.toNumber() ?? null,
                            currency: tx.currency,
                            fees: tx.fees.toNumber(),
                            tax: tx.tax.toNumber(),
                            notes: tx.notes,
                            security: tx.security
                              ? {
                                  ticker: tx.security.ticker,
                                  exchange: tx.security.exchange,
                                  name: tx.security.name,
                                  currency: tx.security.currency,
                                }
                              : null,
                          }}
                          trigger={
                            <Button variant="ghost" size="icon" aria-label="עריכת עסקה">
                              <Pencil className="size-4" />
                            </Button>
                          }
                        />
                        <DeleteTransactionButton transactionId={tx.id} />
                      </div>
                    </TableCell>
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
