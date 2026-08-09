import { db } from "@/lib/db";

/**
 * All portfolio data access is scoped by userId here so no query in the
 * app can accidentally leak another user's data (spec §3).
 */
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
