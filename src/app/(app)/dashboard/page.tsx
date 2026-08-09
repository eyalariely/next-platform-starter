import { Briefcase } from "lucide-react";

import { auth } from "@/lib/auth";
import { listPortfoliosForUser } from "@/services/portfolio.service";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const session = await auth();
  const portfolios = session?.user?.id
    ? await listPortfoliosForUser(session.user.id)
    : [];

  return (
    <div>
      <PageHeader
        title="לוח בקרה"
        description="סקירה כללית של תיקי ההשקעות שלך"
      />

      {portfolios.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Briefcase className="size-8 text-muted-foreground" aria-hidden="true" />
            <p className="font-medium">אין עדיין תיק השקעות</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              צור תיק השקעות ראשון כדי להתחיל לעקוב אחר עסקאות, ביצועים וסיכון.
              יצירת תיקים ויבוא עסקאות יתווספו בשלב הפיתוח הבא.
            </p>
            <Button disabled>יצירת תיק השקעות</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {portfolios.map((portfolio) => (
            <Card key={portfolio.id}>
              <CardContent>
                <p className="font-medium">{portfolio.name}</p>
                <p className="text-sm text-muted-foreground ltr-numeric">
                  {portfolio.baseCurrency}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
