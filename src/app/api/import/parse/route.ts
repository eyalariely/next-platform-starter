import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { parseImportFile } from "@/services/import.service";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "לא נבחר קובץ" }, { status: 400 });
  }
  if (!/\.(csv|xlsx)$/i.test(file.name)) {
    return NextResponse.json({ error: "פורמט קובץ לא נתמך — יש להעלות CSV או XLSX" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = await parseImportFile(buffer, file.name);
    if (parsed.headers.length === 0) {
      return NextResponse.json({ error: "הקובץ ריק או שלא ניתן לקרוא אותו" }, { status: 400 });
    }
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ error: "שגיאה בקריאת הקובץ — ודא שהוא CSV/XLSX תקין" }, { status: 400 });
  }
}
