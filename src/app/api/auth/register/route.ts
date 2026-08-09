import { NextResponse } from "next/server";

import { registerSchema } from "@/validators/auth";
import { registerUser, UserAlreadyExistsError } from "@/services/user.service";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "נתוני ההרשמה אינם תקינים", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const user = await registerUser(parsed.data);
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (error instanceof UserAlreadyExistsError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }
}
