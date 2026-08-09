import "server-only";

import { db } from "@/lib/db";
import type { PortfolioInput } from "@/validators/portfolio";

/**
 * All portfolio data access is scoped by userId here so no query in the
 * app can accidentally leak another user's data (spec §3, §1 of stage 2:
 * "אין לאפשר למשתמש לגשת לתיק של משתמש אחר").
 */
export class PortfolioNotFoundError extends Error {
  constructor() {
    super("התיק לא נמצא או שאין לך הרשאה לגשת אליו");
    this.name = "PortfolioNotFoundError";
  }
}

export function listPortfoliosForUser(userId: string) {
  return db.portfolio.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
}

export function getPortfolioForUser(userId: string, portfolioId: string) {
  return db.portfolio.findFirst({
    where: { id: portfolioId, userId },
  });
}

/** Returns the requested portfolio if owned by userId, else the user's
 *  first portfolio, else null. Used to resolve "the active portfolio"
 *  when a page is opened without (or with a stale) ?portfolioId=. */
export async function resolveActivePortfolio(userId: string, requestedId?: string) {
  if (requestedId) {
    const requested = await getPortfolioForUser(userId, requestedId);
    if (requested) return requested;
  }
  const [first] = await listPortfoliosForUser(userId);
  return first ?? null;
}

export function createPortfolio(userId: string, input: PortfolioInput) {
  return db.portfolio.create({
    data: { userId, name: input.name, baseCurrency: input.baseCurrency },
  });
}

export async function updatePortfolio(
  userId: string,
  portfolioId: string,
  input: PortfolioInput,
) {
  const owned = await getPortfolioForUser(userId, portfolioId);
  if (!owned) throw new PortfolioNotFoundError();

  return db.portfolio.update({
    where: { id: portfolioId },
    data: { name: input.name, baseCurrency: input.baseCurrency },
  });
}

export async function deletePortfolio(userId: string, portfolioId: string) {
  const owned = await getPortfolioForUser(userId, portfolioId);
  if (!owned) throw new PortfolioNotFoundError();

  // Cascades to transactions/snapshots/scenarios/etc. per schema.prisma.
  await db.portfolio.delete({ where: { id: portfolioId } });
}
