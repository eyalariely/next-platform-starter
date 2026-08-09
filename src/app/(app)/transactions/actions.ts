"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { transactionSchema } from "@/validators/transaction";
import {
  createTransaction,
  deleteTransaction,
  updateTransaction,
  DuplicateTransactionError,
  SellExceedsHoldingsError,
  TransactionNotFoundError,
} from "@/services/transaction.service";
import { findOrCreateSecurity, SecurityNotFoundError } from "@/services/security.service";
import { PortfolioNotFoundError } from "@/services/portfolio.service";

export type TransactionFormState = {
  error?: string;
  duplicateOf?: string;
  success?: boolean;
};

const SECURITY_REQUIRED_TYPES = new Set(["BUY", "SELL", "DIVIDEND"]);

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHENTICATED");
  return session.user.id;
}

async function buildInputFromFormData(formData: FormData) {
  const type = String(formData.get("type") ?? "");
  const raw: Record<string, unknown> = {
    type,
    portfolioId: formData.get("portfolioId"),
    date: formData.get("date"),
    currency: formData.get("currency"),
    fees: formData.get("fees") || 0,
    tax: formData.get("tax") || 0,
    notes: formData.get("notes"),
    confirmFutureDate: formData.get("confirmFutureDate") === "on",
    quantity: formData.get("quantity") || undefined,
    price: formData.get("price"),
  };

  if (SECURITY_REQUIRED_TYPES.has(type)) {
    const ticker = String(formData.get("securityTicker") ?? "").trim();
    const exchange = String(formData.get("securityExchange") ?? "").trim();
    if (!ticker) {
      return { error: "יש לבחור נייר ערך מתוך רשימת ההצעות" } as const;
    }
    const security = await findOrCreateSecurity(ticker, exchange);
    raw.securityId = security.id;
  }

  return { raw } as const;
}

export async function createTransactionAction(
  _prevState: TransactionFormState,
  formData: FormData,
): Promise<TransactionFormState> {
  const userId = await requireUserId();

  let built: Awaited<ReturnType<typeof buildInputFromFormData>>;
  try {
    built = await buildInputFromFormData(formData);
  } catch (error) {
    if (error instanceof SecurityNotFoundError) return { error: error.message };
    throw error;
  }
  if ("error" in built) return { error: built.error };

  const parsed = transactionSchema.safeParse(built.raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "נתוני העסקה אינם תקינים" };
  }

  const force = formData.get("force") === "1";

  try {
    await createTransaction(userId, parsed.data, { force });
  } catch (error) {
    if (error instanceof DuplicateTransactionError) {
      return { error: error.message, duplicateOf: error.existingId };
    }
    if (
      error instanceof SellExceedsHoldingsError ||
      error instanceof PortfolioNotFoundError ||
      error instanceof TransactionNotFoundError
    ) {
      return { error: error.message };
    }
    throw error;
  }

  const portfolioId = String(formData.get("portfolioId") ?? "");
  revalidatePath("/transactions");
  revalidatePath("/holdings");
  revalidatePath("/portfolio");
  revalidatePath("/dashboard");
  void portfolioId;
  return { success: true };
}

export async function updateTransactionAction(
  _prevState: TransactionFormState,
  formData: FormData,
): Promise<TransactionFormState> {
  const userId = await requireUserId();
  const transactionId = String(formData.get("transactionId") ?? "");
  if (!transactionId) return { error: "עסקה לא תקינה" };

  let built: Awaited<ReturnType<typeof buildInputFromFormData>>;
  try {
    built = await buildInputFromFormData(formData);
  } catch (error) {
    if (error instanceof SecurityNotFoundError) return { error: error.message };
    throw error;
  }
  if ("error" in built) return { error: built.error };

  const parsed = transactionSchema.safeParse(built.raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "נתוני העסקה אינם תקינים" };
  }

  const force = formData.get("force") === "1";

  try {
    await updateTransaction(userId, transactionId, parsed.data, { force });
  } catch (error) {
    if (error instanceof DuplicateTransactionError) {
      return { error: error.message, duplicateOf: error.existingId };
    }
    if (
      error instanceof SellExceedsHoldingsError ||
      error instanceof PortfolioNotFoundError ||
      error instanceof TransactionNotFoundError
    ) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath("/transactions");
  revalidatePath("/holdings");
  revalidatePath("/portfolio");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteTransactionAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const transactionId = String(formData.get("transactionId") ?? "");
  if (!transactionId) return;

  await deleteTransaction(userId, transactionId);

  revalidatePath("/transactions");
  revalidatePath("/holdings");
  revalidatePath("/portfolio");
  revalidatePath("/dashboard");
}
