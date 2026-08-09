"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { portfolioSchema } from "@/validators/portfolio";
import {
  createPortfolio,
  deletePortfolio,
  updatePortfolio,
  PortfolioNotFoundError,
} from "@/services/portfolio.service";

export type PortfolioFormState = { error?: string };

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHENTICATED");
  return session.user.id;
}

export async function createPortfolioAction(
  _prevState: PortfolioFormState,
  formData: FormData,
): Promise<PortfolioFormState> {
  const parsed = portfolioSchema.safeParse({
    name: formData.get("name"),
    baseCurrency: formData.get("baseCurrency"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "נתונים לא תקינים" };
  }

  const userId = await requireUserId();
  const portfolio = await createPortfolio(userId, parsed.data);

  revalidatePath("/portfolio");
  revalidatePath("/dashboard");
  redirect(`/portfolio?portfolioId=${portfolio.id}`);
}

export async function updatePortfolioAction(
  _prevState: PortfolioFormState,
  formData: FormData,
): Promise<PortfolioFormState> {
  const portfolioId = String(formData.get("portfolioId") ?? "");
  const parsed = portfolioSchema.safeParse({
    name: formData.get("name"),
    baseCurrency: formData.get("baseCurrency"),
  });
  if (!portfolioId || !parsed.success) {
    return { error: parsed.success ? "תיק לא תקין" : parsed.error.issues[0]?.message };
  }

  const userId = await requireUserId();
  try {
    await updatePortfolio(userId, portfolioId, parsed.data);
  } catch (error) {
    if (error instanceof PortfolioNotFoundError) return { error: error.message };
    throw error;
  }

  revalidatePath("/portfolio");
  revalidatePath("/dashboard");
  return {};
}

export async function deletePortfolioAction(formData: FormData): Promise<void> {
  const portfolioId = String(formData.get("portfolioId") ?? "");
  if (!portfolioId) return;

  const userId = await requireUserId();
  await deletePortfolio(userId, portfolioId);

  revalidatePath("/portfolio");
  revalidatePath("/dashboard");
  redirect("/portfolio");
}
