"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { cn } from "@/lib/utils";
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";
import type { DailyReturnPoint } from "@/lib/financial/performance-engine";

type RangeKey = "1M" | "3M" | "6M" | "YTD" | "1Y" | "ALL";
const RANGES: RangeKey[] = ["1M", "3M", "6M", "YTD", "1Y", "ALL"];

function filterByRange(series: DailyReturnPoint[], range: RangeKey): DailyReturnPoint[] {
  if (range === "ALL" || series.length === 0) return series;

  const last = new Date(`${series[series.length - 1].date}T00:00:00Z`);
  const start = new Date(last);
  if (range === "YTD") {
    start.setUTCMonth(0, 1);
  } else {
    const monthsBack: Record<Exclude<RangeKey, "ALL" | "YTD">, number> = {
      "1M": 1, "3M": 3, "6M": 6, "1Y": 12,
    };
    start.setUTCMonth(start.getUTCMonth() - monthsBack[range as Exclude<RangeKey, "ALL" | "YTD">]);
  }
  const startIso = start.toISOString().slice(0, 10);
  // No artificial interpolation — only real data points at/after the cutoff (spec §16/§33).
  return series.filter((p) => p.date >= startIso);
}

export function PerformanceChart({
  series,
  baseCurrency,
}: {
  series: DailyReturnPoint[];
  baseCurrency: string;
}) {
  const [mode, setMode] = useState<"value" | "return">("value");
  const [range, setRange] = useState<RangeKey>("6M");

  const filtered = useMemo(() => filterByRange(series, range), [series, range]);

  if (series.length < 2) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        עדיין אין מספיק היסטוריה להצגת גרף ביצועים
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-md border p-0.5 text-sm">
          {(["value", "return"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                "rounded-sm px-3 py-1",
                mode === m ? "bg-secondary text-secondary-foreground" : "text-muted-foreground",
              )}
            >
              {m === "value" ? "שווי תיק" : "תשואה מצטברת"}
            </button>
          ))}
        </div>
        <div className="flex rounded-md border p-0.5 text-sm">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={cn(
                "rounded-sm px-2.5 py-1 ltr-numeric",
                range === r ? "bg-secondary text-secondary-foreground" : "text-muted-foreground",
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="h-72 w-full ltr-numeric" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={filtered} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={(v: string) => formatDate(v, { month: "short", day: "numeric" })}
              tick={{ fontSize: 12 }}
              stroke="currentColor"
              className="text-muted-foreground"
              minTickGap={40}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              stroke="currentColor"
              className="text-muted-foreground"
              width={64}
              tickFormatter={(v: number) =>
                mode === "value" ? formatCurrency(v, baseCurrency, { notation: "compact" }) : formatPercent(v, 0)
              }
              domain={mode === "return" ? ["auto", "auto"] : undefined}
            />
            <Tooltip
              formatter={(value) =>
                mode === "value"
                  ? formatCurrency(Number(value), baseCurrency)
                  : formatPercent(Number(value), 2)
              }
              labelFormatter={(label) => formatDate(String(label))}
              contentStyle={{ direction: "rtl" }}
            />
            <Line
              type="monotone"
              dataKey={mode === "value" ? "portfolioValueBase" : "cumulativeReturn"}
              stroke="var(--color-chart-1)"
              strokeWidth={2}
              dot={false}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
