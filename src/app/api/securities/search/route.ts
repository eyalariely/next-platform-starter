import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { searchSecurities } from "@/services/security.service";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const query = new URL(request.url).searchParams.get("q") ?? "";
  if (query.trim().length < 1) {
    return NextResponse.json({ results: [] });
  }

  try {
    const results = await searchSecurities(query);
    return NextResponse.json({ results });
  } catch {
    // Provider/network failure — degrade to an empty list rather than a
    // 500 that would break the combobox (spec §18).
    return NextResponse.json({ results: [] });
  }
}
