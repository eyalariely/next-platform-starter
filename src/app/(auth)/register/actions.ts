"use server";

import { AuthError } from "next-auth";

import { signIn } from "@/lib/auth";
import { registerSchema } from "@/validators/auth";
import { registerUser, UserAlreadyExistsError } from "@/services/user.service";

export type RegisterFormState = { error?: string };

export async function registerAction(
  _prevState: RegisterFormState,
  formData: FormData,
): Promise<RegisterFormState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "נתוני ההרשמה אינם תקינים" };
  }

  try {
    await registerUser(parsed.data);
  } catch (error) {
    if (error instanceof UserAlreadyExistsError) {
      return { error: error.message };
    }
    throw error;
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "ההרשמה הושלמה אך ההתחברות נכשלה, נסה להתחבר ידנית" };
    }
    throw error;
  }

  return {};
}
