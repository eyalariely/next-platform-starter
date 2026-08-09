import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/layout/page-header";
import { ComingSoon } from "@/components/layout/coming-soon";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export default async function SettingsPage() {
  const session = await auth();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="הגדרות" description="פרופיל משתמש והעדפות מערכת" />

      <Card>
        <CardHeader>
          <CardTitle>פרופיל</CardTitle>
          <CardDescription>פרטי החשבון שלך</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <Label className="text-muted-foreground">שם</Label>
            <p>{session?.user?.name ?? "—"}</p>
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-muted-foreground">אימייל</Label>
            <p className="ltr-numeric text-start">{session?.user?.email ?? "—"}</p>
          </div>
        </CardContent>
      </Card>

      <ComingSoon
        title="מטבע בסיס, Benchmark ברירת מחדל, ספי סיכון ומשקלי Risk Score"
        stage="שלב 9 (הגדרות מתקדמות)"
      />
    </div>
  );
}
