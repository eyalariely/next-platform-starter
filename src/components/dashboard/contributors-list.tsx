import Link from "next/link";

import { formatCurrency } from "@/lib/format";
import { Numeric } from "@/components/ui/numeric";

export interface ContributorRow {
  ticker: string;
  totalPnLBase: number | null;
}

export function ContributorsList({
  title,
  rows,
  baseCurrency,
  tone,
}: {
  title: string;
  rows: ContributorRow[];
  baseCurrency: string;
  tone: "gain" | "loss";
}) {
  if (rows.length === 0) {
    return (
      <div>
        <p className="mb-2 text-sm font-medium text-muted-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">אין נתונים</p>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-muted-foreground">{title}</p>
      <ul className="flex flex-col gap-2">
        {rows.map((r) => (
          <li key={r.ticker} className="flex items-center justify-between text-sm">
            <Link href={`/securities/${r.ticker}`} className="ltr-numeric font-medium text-primary hover:underline">
              {r.ticker}
            </Link>
            <Numeric className={tone === "gain" ? "text-gain" : "text-loss"}>
              {r.totalPnLBase !== null ? formatCurrency(r.totalPnLBase, baseCurrency) : "—"}
            </Numeric>
          </li>
        ))}
      </ul>
    </div>
  );
}
