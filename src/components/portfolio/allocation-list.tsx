import { formatPercent } from "@/lib/format";
import { Numeric } from "@/components/ui/numeric";

export interface AllocationItem {
  label: string;
  weight: number; // decimal 0..1
}

/**
 * Simple labeled bar list. Full chart treatments (pie/donut with Top-N +
 * "Other" grouping per spec §25) land in stage 3 alongside the rest of
 * the dashboard's chart work — this covers the stage-2 requirement to
 * *show* allocation without pulling charting into the portfolio engine's
 * stage.
 */
export function AllocationList({ items }: { items: AllocationItem[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">אין נתונים להצגה</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li key={item.label} className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-sm">
            <span className="truncate">{item.label}</span>
            <Numeric className="text-muted-foreground">{formatPercent(item.weight, 1)}</Numeric>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.min(100, Math.max(0, item.weight * 100))}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
