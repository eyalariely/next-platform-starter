import bcrypt from "bcryptjs";

import { db } from "@/lib/db";
import { registerSchema, type RegisterInput } from "@/validators/auth";

export class UserAlreadyExistsError extends Error {
  constructor() {
    super("קיים כבר משתמש עם כתובת אימייל זו");
  }
}

/**
 * Creates a new user with a bcrypt-hashed password. Shared by the
 * `/api/auth/register` route and the register page's server action so
 * both go through one validated path.
 */
export async function registerUser(input: RegisterInput) {
  const parsed = registerSchema.parse(input);

  const existing = await db.user.findUnique({ where: { email: parsed.email } });
  if (existing) {
    throw new UserAlreadyExistsError();
  }

  const passwordHash = await bcrypt.hash(parsed.password, 12);

  return db.user.create({
    data: { name: parsed.name, email: parsed.email, passwordHash },
    select: { id: true, email: true, name: true },
  });
}
