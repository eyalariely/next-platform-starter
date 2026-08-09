"use client";

import { useEffect } from "react";

/**
 * Catches errors thrown by the root layout itself — the one case
 * error.tsx can't cover, so this needs its own <html>/<body> (spec §51).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[smart-folio] unhandled root error", error);
  }, [error]);

  return (
    <html lang="he" dir="rtl">
      <body className="flex min-h-screen items-center justify-center bg-white p-6 text-neutral-900">
        <div className="flex max-w-md flex-col items-center gap-3 text-center">
          <p className="text-lg font-semibold">אירעה שגיאה בלתי צפויה</p>
          <p className="text-sm text-neutral-500">
            נסה לרענן את הדף. אם הבעיה חוזרת, נסה שוב מאוחר יותר.
          </p>
          <button
            type="button"
            onClick={reset}
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white"
          >
            נסה שוב
          </button>
        </div>
      </body>
    </html>
  );
}
