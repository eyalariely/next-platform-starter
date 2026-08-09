import type { LucideIcon } from "lucide-react";
import { Construction } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

/**
 * Placeholder for routes whose real implementation lands in a later
 * development stage (spec §65). Keeps navigation fully wired from stage 1
 * without faking data the feature doesn't compute yet.
 */
export function ComingSoon({
  title,
  stage,
  icon: Icon = Construction,
}: {
  title: string;
  stage: string;
  icon?: LucideIcon;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
        <Icon className="size-8 text-muted-foreground" aria-hidden="true" />
        <p className="font-medium">{title}</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          המסך יוקם ב{stage} של הפיתוח, בהתאם לתוכנית השלבים.
        </p>
      </CardContent>
    </Card>
  );
}
