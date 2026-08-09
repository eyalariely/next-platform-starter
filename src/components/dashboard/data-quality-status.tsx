import { CheckCircle2, TriangleAlert } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/**
 * Surfaces missing price/FX/benchmark data and stale prices (spec §27-28)
 * — never silently fills a gap with 0, always tells the user what's
 * incomplete and why a number might be missing elsewhere on the page.
 */
export function DataQualityStatus({
  warnings,
  staleTickers = [],
}: {
  warnings: string[];
  staleTickers?: string[];
}) {
  const hasIssues = warnings.length > 0 || staleTickers.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {hasIssues ? (
            <TriangleAlert className="size-4 text-warning-foreground" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="size-4 text-gain" aria-hidden="true" />
          )}
          מצב איכות הנתונים
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {!hasIssues ? (
          <p className="text-sm text-muted-foreground">כל הנתונים עדכניים וזמינים.</p>
        ) : (
          <>
            {staleTickers.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">מחירים לא עדכניים:</span>
                {staleTickers.map((ticker) => (
                  <Badge key={ticker} variant="warning" className="ltr-numeric">
                    {ticker}
                  </Badge>
                ))}
              </div>
            ) : null}
            {warnings.length > 0 ? (
              <ul className="list-inside list-disc text-sm text-muted-foreground">
                {warnings.slice(0, 8).map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
