import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email("כתובת אימייל לא תקינה"),
  password: z.string().min(1, "נדרשת סיסמה"),
});

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, "שם קצר מדי").max(100),
    email: z.string().trim().email("כתובת אימייל לא תקינה"),
    password: z
      .string()
      .min(8, "הסיסמה חייבת להכיל לפחות 8 תווים")
      .max(72, "הסיסמה ארוכה מדי"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "הסיסמאות אינן תואמות",
    path: ["confirmPassword"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
