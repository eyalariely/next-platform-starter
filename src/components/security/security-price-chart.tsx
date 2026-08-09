"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatCurrency, formatDate } from "@/lib/format";

export function SecurityPriceChart({
  series,
  currency,
}: {
  series: { date: string; price: number }[];
  currency: string;
}) {
  if (series.length < 2) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        אין מספיק היסטוריית מחירים להצגת גרף
      </p>
    );
  }

  return (
    <div className="h-64 w-full ltr-numeric" dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={series} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
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
            domain={["auto", "auto"]}
            tickFormatter={(v: number) => formatCurrency(v, currency, { notation: "compact" })}
          />
          <Tooltip
            formatter={(value) => formatCurrency(Number(value), currency)}
            labelFormatter={(label) => formatDate(String(label))}
            contentStyle={{ direction: "rtl" }}
          />
          <Line type="monotone" dataKey="price" stroke="var(--color-chart-1)" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
