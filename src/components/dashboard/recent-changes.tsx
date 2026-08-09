import Link from "next/link";
import { History } from "lucide-react";

import { TRANSACTION_TYPE_LABELS } from "@/components/transactions/transaction-type-labels";
import { Badge } from "@/components/ui/badge";
import { Numeric } from "@/components/ui/numeric";
import { formatDate, formatNumber } from "@/lib/format";

export interface RecentChangeRow {
  id: string;
  date: Date;
  type: string;
  ticker: string | null;
  quantity: number | null;
  price: number | null;
  currency: string;
}

export function RecentChanges({ rows }: { rows: RecentChangeRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
        <History className="size-6" aria-hidden="true" />
        אין עדיין פעילות בתיק
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {rows.map((tx) => (
        <li key={tx.id} className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {TRANSACTION_TYPE_LABELS[tx.type as keyof typeof TRANSACTION_TYPE_LABELS] ?? tx.type}
            </Badge>
            {tx.ticker ? (
              <Link href={`/securities/${tx.ticker}`} className="ltr-numeric font-medium text-primary hover:underline">
                {tx.ticker}
              </Link>
            ) : null}
          </div>
          <div className="flex items-center gap-3 text-muted-foreground">
            {tx.quantity !== null ? <Numeric>{formatNumber(tx.quantity)}</Numeric> : null}
            <Numeric>{formatDate(tx.date)}</Numeric>
          </div>
        </li>
      ))}
    </ul>
  );
}
