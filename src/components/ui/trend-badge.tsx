import { ArrowDownRight, ArrowUpRight, Minus, TriangleAlert } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatPercent } from "@/lib/format";
import { Numeric } from "@/components/ui/numeric";

export type TrendDirection = "up" | "down" | "warning" | "neutral";

const DIRECTION_STYLES: Record<
  TrendDirection,
  { icon: typeof ArrowUpRight; className: string; label: string }
> = {
  up: {
    icon: ArrowUpRight,
    className: "bg-gain/15 text-gain",
    label: "שיפור",
  },
  down: {
    icon: ArrowDownRight,
    className: "bg-loss/15 text-loss",
    label: "החמרה",
  },
  warning: {
    icon: TriangleAlert,
    className: "bg-warning/20 text-warning-foreground",
    label: "אזהרה",
  },
  neutral: {
    icon: Minus,
    className: "bg-neutral-signal/15 text-neutral-signal",
    label: "ללא שינוי",
  },
};

/**
 * Communicates gain/loss/warning/neutral state with an icon AND text label —
 * never with color alone (spec §2).
 */
export function TrendBadge({
  direction,
  value,
  className,
}: {
  direction: TrendDirection;
  /** Decimal value (e.g. 0.0432 for +4.32%). Omit for a plain state badge. */
  value?: number;
  className?: string;
}) {
  const { icon: Icon, className: directionClassName, label } = DIRECTION_STYLES[direction];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium",
        directionClassName,
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {value === undefined ? (
        <span>{label}</span>
      ) : (
        <Numeric>{formatPercent(value)}</Numeric>
      )}
      <span className="sr-only">{label}</span>
    </span>
  );
}
