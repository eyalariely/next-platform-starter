"use server";

import { AuthError } from "next-auth";

import { signIn } from "@/lib/auth";
import { loginSchema } from "@/validators/auth";

export type LoginFormState = { error?: string };

export async function loginAction(
  _prevState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "פרטי ההתחברות אינם תקינים" };
  }

  const callbackUrl = (formData.get("callbackUrl") as string) || "/dashboard";

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: callbackUrl,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "אימייל או סיסמה שגויים" };
    }
    // Re-throw NEXT_REDIRECT and any other non-auth error so navigation
    // (and unexpected failures) behave normally.
    throw error;
  }

  return {};
}
