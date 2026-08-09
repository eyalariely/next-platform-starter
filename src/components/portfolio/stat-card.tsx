import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Numeric } from "@/components/ui/numeric";

export function StatCard({
  label,
  value,
  tone = "neutral",
  secondary,
}: {
  label: string;
  value: string;
  tone?: "gain" | "loss" | "neutral";
  secondary?: string;
}) {
  return (
    <Card className="gap-1.5 p-4">
      <CardContent className="flex flex-col gap-1 p-0">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Numeric
          as="span"
          className={cn(
            "text-2xl font-semibold",
            tone === "gain" && "text-gain",
            tone === "loss" && "text-loss",
          )}
        >
          {value}
        </Numeric>
        {secondary ? <Numeric className="text-xs text-muted-foreground">{secondary}</Numeric> : null}
      </CardContent>
    </Card>
  );
}
