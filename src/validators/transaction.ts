import { z } from "zod";

import { SUPPORTED_CURRENCIES } from "@/validators/portfolio";

function isValidDateString(value: string): boolean {
  return !Number.isNaN(new Date(value).getTime());
}

const dateField = z
  .string()
  .refine(isValidDateString, { message: "תאריך לא תקין" });

const baseFields = {
  portfolioId: z.string().trim().min(1, "יש לבחור תיק השקעות"),
  date: dateField,
  currency: z.enum(SUPPORTED_CURRENCIES, { message: "מטבע לא נתמך" }),
  fees: z.coerce.number().min(0, "עמלה לא יכולה להיות שלילית").default(0),
  tax: z.coerce.number().min(0, "מס לא יכול להיות שלילי").default(0),
  notes: z
    .string()
    .trim()
    .max(500, "הערה ארוכה מדי")
    .optional()
    .transform((v) => (v ? v : undefined)),
  /** UI must set this explicitly to submit a future-dated transaction
   *  (spec §2: "אין תאריך עתידי ללא אישור"). */
  confirmFutureDate: z.coerce.boolean().optional().default(false),
};

const buySellFields = {
  securityId: z.string().trim().min(1, "יש לבחור נייר ערך"),
  quantity: z.coerce.number().positive("כמות חייבת להיות גדולה מאפס"),
  price: z.coerce.number().positive("מחיר חייב להיות גדול מאפס"),
};

export const transactionSchema = z
  .discriminatedUnion("type", [
    z.object({ type: z.literal("BUY"), ...baseFields, ...buySellFields }),
    z.object({ type: z.literal("SELL"), ...baseFields, ...buySellFields }),
    z.object({
      type: z.literal("DIVIDEND"),
      ...baseFields,
      securityId: z.string().trim().min(1, "יש לבחור נייר ערך"),
      quantity: z.coerce.number().nonnegative().optional(),
      price: z.coerce.number().positive("סכום הדיבידנד חייב להיות גדול מאפס"),
    }),
    z.object({
      type: z.literal("DEPOSIT"),
      ...baseFields,
      price: z.coerce.number().positive("הסכום חייב להיות גדול מאפס"),
    }),
    z.object({
      type: z.literal("WITHDRAWAL"),
      ...baseFields,
      price: z.coerce.number().positive("הסכום חייב להיות גדול מאפס"),
    }),
    z.object({
      type: z.literal("FEE"),
      ...baseFields,
      price: z.coerce.number().positive("סכום העמלה חייב להיות גדול מאפס"),
    }),
  ])
  .superRefine((data, ctx) => {
    const txDate = new Date(data.date);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    if (txDate.getTime() > endOfToday.getTime() && !data.confirmFutureDate) {
      ctx.addIssue({
        code: "custom",
        message: "התאריך בעתיד — יש לאשר שזו עסקה עתידית מכוונת",
        path: ["date"],
      });
    }
  });

export type TransactionInput = z.infer<typeof transactionSchema>;
