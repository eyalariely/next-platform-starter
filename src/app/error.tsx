"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Route-segment error boundary (spec §51 "אין Crash", §52 "אין מסך לבן").
 * Rendered inside the existing (RTL) root layout, so this only needs to
 * cover the content area.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[smart-folio] unhandled route error", error);
  }, [error]);

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <TriangleAlert className="size-8 text-warning-foreground" aria-hidden="true" />
          <p className="font-medium">אירעה שגיאה בלתי צפויה</p>
          <p className="text-sm text-muted-foreground">
            הצוות שלנו קיבל את פרטי השגיאה. ניתן לנסות שוב או לחזור מאוחר יותר.
          </p>
          <Button onClick={reset}>נסה שוב</Button>
        </CardContent>
      </Card>
    </div>
  );
}
