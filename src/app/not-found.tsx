import Link from "next/link";
import { Compass } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <Compass className="size-8 text-muted-foreground" aria-hidden="true" />
          <p className="font-medium">הדף המבוקש לא נמצא</p>
          <p className="text-sm text-muted-foreground">
            ייתכן שהקישור שגוי או שהתוכן הוסר.
          </p>
          <Button asChild>
            <Link href="/dashboard">חזרה ללוח הבקרה</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
