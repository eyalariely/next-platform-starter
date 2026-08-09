import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { getPortfolioForUser } from "@/services/portfolio.service";
import { commitImportRows } from "@/services/import.service";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    portfolioId?: string;
    rows?: { validated: Record<string, unknown>; force?: boolean }[];
  } | null;

  if (!body?.portfolioId || !Array.isArray(body.rows)) {
    return NextResponse.json({ error: "בקשה לא תקינה" }, { status: 400 });
  }

  const portfolio = await getPortfolioForUser(session.user.id, body.portfolioId);
  if (!portfolio) {
    return NextResponse.json({ error: "התיק לא נמצא" }, { status: 404 });
  }

  const result = await commitImportRows(session.user.id, body.rows);

  revalidatePath("/transactions");
  revalidatePath("/holdings");
  revalidatePath("/portfolio");
  revalidatePath("/dashboard");

  return NextResponse.json(result);
}
