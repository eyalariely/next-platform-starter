"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatDate } from "@/lib/format";
import type { PortfolioVsBenchmarkPoint } from "@/lib/financial/benchmark-engine";

export function BenchmarkChart({
  aligned,
  benchmarkName,
}: {
  aligned: PortfolioVsBenchmarkPoint[];
  benchmarkName: string;
}) {
  if (aligned.length < 2) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        עדיין אין מספיק היסטוריה להשוואה מול Benchmark
      </p>
    );
  }

  return (
    <div className="h-72 w-full ltr-numeric" dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={aligned} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
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
            width={48}
            domain={["auto", "auto"]}
          />
          <Tooltip
            labelFormatter={(label) => formatDate(String(label))}
            formatter={(value) => Number(value).toFixed(2)}
            contentStyle={{ direction: "rtl" }}
          />
          <Legend
            formatter={(value: string) => (value === "portfolioIndex" ? "תיק" : benchmarkName)}
          />
          <Line
            type="monotone"
            dataKey="portfolioIndex"
            name="portfolioIndex"
            stroke="var(--color-chart-1)"
            strokeWidth={2}
            dot={false}
            connectNulls={false}
          />
          <Line
            type="monotone"
            dataKey="benchmarkIndex"
            name="benchmarkIndex"
            stroke="var(--color-chart-3)"
            strokeWidth={2}
            dot={false}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
