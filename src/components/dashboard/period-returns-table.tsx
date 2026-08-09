import type { BenchmarkComparisonRow } from "@/lib/financial/benchmark-engine";
import { formatPercent } from "@/lib/format";
import { Numeric } from "@/components/ui/numeric";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const PERIOD_LABELS: Record<string, string> = {
  "1M": "חודש",
  "3M": "3 חודשים",
  YTD: "מתחילת השנה",
  "1Y": "שנה",
  SINCE_INCEPTION: "מאז ההקמה",
};

function toneClass(value: number | null) {
  if (value === null) return "";
  return value > 0 ? "text-gain" : value < 0 ? "text-loss" : "";
}

export function PeriodReturnsTable({
  rows,
  benchmarkName,
}: {
  rows: BenchmarkComparisonRow[];
  benchmarkName: string;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>תקופה</TableHead>
          <TableHead>תיק</TableHead>
          <TableHead>{benchmarkName}</TableHead>
          <TableHead>הפרש</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.period}>
            <TableCell>{PERIOD_LABELS[row.period] ?? row.period}</TableCell>
            <TableCell>
              <Numeric className={toneClass(row.portfolioReturn)}>
                {row.portfolioReturn !== null ? formatPercent(row.portfolioReturn, 1) : "—"}
              </Numeric>
            </TableCell>
            <TableCell>
              <Numeric>{row.benchmarkReturn !== null ? formatPercent(row.benchmarkReturn, 1) : "—"}</Numeric>
            </TableCell>
            <TableCell>
              <Numeric className={toneClass(row.difference)}>
                {row.difference !== null ? formatPercent(row.difference, 1) : "—"}
              </Numeric>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
