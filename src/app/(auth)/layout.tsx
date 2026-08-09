import { ChartCandlestick } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-8 bg-muted/40 p-4">
      <div className="flex items-center gap-2 text-lg font-semibold">
        <ChartCandlestick className="size-6 text-primary" aria-hidden="true" />
        Smart Folio
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
