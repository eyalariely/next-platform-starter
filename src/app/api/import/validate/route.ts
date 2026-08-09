import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getPortfolioForUser } from "@/services/portfolio.service";
import { validateImportRows } from "@/services/import.service";
import type { ColumnMapping } from "@/lib/financial/import-parsing";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    portfolioId?: string;
    rows?: string[][];
    mapping?: ColumnMapping;
  } | null;

  if (!body?.portfolioId || !Array.isArray(body.rows) || !body.mapping) {
    return NextResponse.json({ error: "בקשה לא תקינה" }, { status: 400 });
  }

  const portfolio = await getPortfolioForUser(session.user.id, body.portfolioId);
  if (!portfolio) {
    return NextResponse.json({ error: "התיק לא נמצא" }, { status: 404 });
  }

  const results = await validateImportRows(body.portfolioId, body.rows, body.mapping);
  return NextResponse.json({ results });
}
