import type { PeriodKey } from "@/lib/financial/performance-engine";
import { formatPercent } from "@/lib/format";
import { Numeric } from "@/components/ui/numeric";
import { cn } from "@/lib/utils";

const LABELS: Record<PeriodKey, string> = {
  "1D": "יום",
  "1W": "שבוע",
  "1M": "חודש",
  "3M": "3 חודשים",
  YTD: "מתחילת השנה",
  "1Y": "שנה",
  SINCE_INCEPTION: "מאז ההנפקה",
};

export function SecurityPeriodReturns({
  periodReturns,
  sinceFirstPurchase,
}: {
  periodReturns: Record<PeriodKey, number | null>;
  sinceFirstPurchase: number | null;
}) {
  const items: { label: string; value: number | null }[] = [
    { label: LABELS["1M"], value: periodReturns["1M"] },
    { label: LABELS["3M"], value: periodReturns["3M"] },
    { label: LABELS.YTD, value: periodReturns.YTD },
    { label: LABELS["1Y"], value: periodReturns["1Y"] },
    { label: LABELS.SINCE_INCEPTION, value: periodReturns.SINCE_INCEPTION },
    { label: "מאז הרכישה הראשונה", value: sinceFirstPurchase },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      {items.map((item) => (
        <div key={item.label} className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">{item.label}</span>
          <Numeric
            className={cn(
              "font-medium",
              item.value !== null && item.value > 0 && "text-gain",
              item.value !== null && item.value < 0 && "text-loss",
            )}
          >
            {item.value !== null ? formatPercent(item.value, 1) : "—"}
          </Numeric>
        </div>
      ))}
    </div>
  );
}
