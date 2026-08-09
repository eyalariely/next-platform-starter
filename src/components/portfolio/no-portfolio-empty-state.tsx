import { Briefcase } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { PortfolioFormDialog } from "@/components/portfolio/portfolio-form-dialog";

export function NoPortfolioEmptyState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
        <Briefcase className="size-8 text-muted-foreground" aria-hidden="true" />
        <p className="font-medium">אין עדיין תיק השקעות</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          צור תיק השקעות ראשון כדי להתחיל להוסיף עסקאות ולעקוב אחר האחזקות שלך.
        </p>
        <PortfolioFormDialog />
      </CardContent>
    </Card>
  );
}
