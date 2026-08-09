"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, CircleAlert, TriangleAlert, Upload } from "lucide-react";

import {
  IMPORT_TARGET_FIELDS,
  suggestMapping,
  type ColumnMapping,
  type ImportTargetField,
} from "@/lib/financial/import-parsing";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const FIELD_LABELS: Record<ImportTargetField, string> = {
  type: "סוג עסקה",
  ticker: "טיקר",
  date: "תאריך",
  quantity: "כמות",
  price: "מחיר / סכום",
  currency: "מטבע",
  fees: "עמלה",
  tax: "מס",
  notes: "הערות",
};

const REQUIRED_FIELDS: ImportTargetField[] = ["type", "date", "price", "currency"];

interface ParseResponse {
  headers: string[];
  rows: string[][];
  truncated: boolean;
  error?: string;
}

interface ValidationRow {
  rowIndex: number;
  status: "valid" | "invalid" | "warning";
  errors: string[];
  warnings: string[];
  preview: Record<string, unknown>;
  validated?: Record<string, unknown>;
  duplicateOfId?: string;
}

interface CommitResult {
  imported: number;
  skipped: number;
  failed: { rowIndex: number; error: string }[];
}

type Step = "upload" | "mapping" | "review" | "done";

export function ImportWizard({ portfolioId }: { portfolioId: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("upload");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [truncated, setTruncated] = useState(false);
  const [mapping, setMapping] = useState<ColumnMapping>({});

  const [results, setResults] = useState<ValidationRow[]>([]);
  const [includeWarnings, setIncludeWarnings] = useState(false);
  const [commitResult, setCommitResult] = useState<CommitResult | null>(null);

  const counts = useMemo(() => {
    return {
      valid: results.filter((r) => r.status === "valid").length,
      warning: results.filter((r) => r.status === "warning").length,
      invalid: results.filter((r) => r.status === "invalid").length,
    };
  }, [results]);

  async function handleUpload(file: File) {
    setError(null);
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/import/parse", { method: "POST", body: formData });
      const data: ParseResponse = await res.json();
      if (!res.ok) throw new Error(data.error ?? "שגיאה בקריאת הקובץ");

      setHeaders(data.headers);
      setRows(data.rows);
      setTruncated(data.truncated);
      setMapping(suggestMapping(data.headers));
      setStep("mapping");
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה בקריאת הקובץ");
    } finally {
      setLoading(false);
    }
  }

  async function handleValidate() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/import/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portfolioId, rows, mapping }),
      });
      const data: { results?: ValidationRow[]; error?: string } = await res.json();
      if (!res.ok) throw new Error(data.error ?? "שגיאה באימות הנתונים");
      setResults(data.results ?? []);
      setStep("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה באימות הנתונים");
    } finally {
      setLoading(false);
    }
  }

  async function handleCommit() {
    setError(null);
    setLoading(true);
    try {
      const rowsToImport = results
        .filter((r) => r.status === "valid" || (includeWarnings && r.status === "warning"))
        .filter((r) => r.validated)
        .map((r) => ({ validated: r.validated!, force: r.status === "warning" }));

      const res = await fetch("/api/import/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portfolioId, rows: rowsToImport }),
      });
      const data: CommitResult & { error?: string } = await res.json();
      if (!res.ok) throw new Error(data.error ?? "שגיאה בייבוא");
      setCommitResult(data);
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה בייבוא");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <ol className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        {(["upload", "mapping", "review", "done"] as const).map((s, i) => (
          <li key={s} className={cn("flex items-center gap-2", step === s && "font-medium text-foreground")}>
            <span
              className={cn(
                "flex size-5 items-center justify-center rounded-full border text-xs",
                step === s && "border-primary bg-primary text-primary-foreground",
              )}
            >
              {i + 1}
            </span>
            {{ upload: "העלאה", mapping: "מיפוי ותצוגה מקדימה", review: "אימות ואישור", done: "סיום" }[s]}
            {i < 3 ? <span className="mx-1">›</span> : null}
          </li>
        ))}
      </ol>

      {error ? (
        <div className="rounded-md border border-loss/30 bg-loss/10 p-3 text-sm text-loss">{error}</div>
      ) : null}

      {step === "upload" ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <Upload className="size-8 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">בחר קובץ CSV או XLSX עם עסקאות לייבוא</p>
            <input
              type="file"
              accept=".csv,.xlsx"
              disabled={loading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleUpload(file);
              }}
              className="text-sm"
            />
            {loading ? <p className="text-sm text-muted-foreground">קורא קובץ...</p> : null}
          </CardContent>
        </Card>
      ) : null}

      {step === "mapping" ? (
        <>
          {truncated ? (
            <div className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
              הקובץ נחתך ל-2000 השורות הראשונות.
            </div>
          ) : null}
          <Card>
            <CardHeader>
              <CardTitle>מיפוי עמודות</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {IMPORT_TARGET_FIELDS.map((field) => (
                <div key={field} className="flex flex-col gap-1.5">
                  <label className="text-xs text-muted-foreground">
                    {FIELD_LABELS[field]}
                    {REQUIRED_FIELDS.includes(field) ? " *" : ""}
                  </label>
                  <Select
                    value={mapping[field] !== undefined ? String(mapping[field]) : "none"}
                    onValueChange={(v) =>
                      setMapping((prev) => ({
                        ...prev,
                        [field]: v === "none" ? undefined : Number(v),
                      }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">לא ממופה</SelectItem>
                      {headers.map((h, i) => (
                        <SelectItem key={i} value={String(i)}>
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>תצוגה מקדימה ({rows.length} שורות)</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    {IMPORT_TARGET_FIELDS.map((f) => (
                      <TableHead key={f}>{FIELD_LABELS[f]}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.slice(0, 5).map((row, i) => (
                    <TableRow key={i}>
                      {IMPORT_TARGET_FIELDS.map((f) => {
                        const idx = mapping[f];
                        return (
                          <TableCell key={f} className="ltr-numeric">
                            {idx !== undefined ? row[idx] ?? "" : ""}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep("upload")}>
              חזרה
            </Button>
            <Button onClick={handleValidate} disabled={loading}>
              {loading ? "מאמת..." : "אימות נתונים"}
            </Button>
          </div>
        </>
      ) : null}

      {step === "review" ? (
        <>
          <div className="flex flex-wrap gap-3">
            <Badge variant="gain">{counts.valid} תקינות</Badge>
            <Badge variant="warning">{counts.warning} עם התראה</Badge>
            <Badge variant="loss">{counts.invalid} לא תקינות</Badge>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>סטטוס</TableHead>
                    <TableHead>סוג</TableHead>
                    <TableHead>תאריך</TableHead>
                    <TableHead>טיקר</TableHead>
                    <TableHead>הודעות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((r) => (
                    <TableRow key={r.rowIndex}>
                      <TableCell>{r.rowIndex + 1}</TableCell>
                      <TableCell>
                        {r.status === "valid" ? (
                          <CheckCircle2 className="size-4 text-gain" aria-label="תקין" />
                        ) : r.status === "warning" ? (
                          <TriangleAlert className="size-4 text-warning-foreground" aria-label="התראה" />
                        ) : (
                          <CircleAlert className="size-4 text-loss" aria-label="שגיאה" />
                        )}
                      </TableCell>
                      <TableCell className="ltr-numeric">{String(r.preview.type ?? "")}</TableCell>
                      <TableCell className="ltr-numeric">{String(r.preview.date ?? "")}</TableCell>
                      <TableCell className="ltr-numeric">{String(r.preview.ticker ?? "")}</TableCell>
                      <TableCell className="max-w-72 text-xs text-muted-foreground">
                        {[...r.errors, ...r.warnings].join(" · ")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {counts.warning > 0 ? (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={includeWarnings}
                onChange={(e) => setIncludeWarnings(e.target.checked)}
                className="size-4"
              />
              כלול גם שורות עם התראה (כגון כפילויות אפשריות) בייבוא
            </label>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep("mapping")}>
              חזרה למיפוי
            </Button>
            <Button
              onClick={handleCommit}
              disabled={loading || (counts.valid === 0 && !(includeWarnings && counts.warning > 0))}
            >
              {loading ? "מייבא..." : `ייבוא ${counts.valid + (includeWarnings ? counts.warning : 0)} עסקאות`}
            </Button>
          </div>
        </>
      ) : null}

      {step === "done" && commitResult ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <CheckCircle2 className="size-8 text-gain" aria-hidden="true" />
            <p className="font-medium">הייבוא הושלם</p>
            <p className="text-sm text-muted-foreground">
              יובאו <span className="ltr-numeric">{commitResult.imported}</span> עסקאות
              {commitResult.skipped > 0 ? (
                <>
                  , דולגו <span className="ltr-numeric">{commitResult.skipped}</span>
                </>
              ) : null}
            </p>
            {commitResult.failed.length > 0 ? (
              <ul className="text-start text-xs text-loss">
                {commitResult.failed.slice(0, 10).map((f, i) => (
                  <li key={i}>
                    שורה {f.rowIndex + 1}: {f.error}
                  </li>
                ))}
              </ul>
            ) : null}
            <Button onClick={() => router.push(`/transactions?portfolioId=${portfolioId}`)}>
              מעבר לעסקאות
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
