import "server-only";

import type { Prisma, TransactionType } from "@prisma/client";

import { db } from "@/lib/db";
import { getPortfolioForUser, PortfolioNotFoundError } from "@/services/portfolio.service";
import type { TransactionInput } from "@/validators/transaction";
import { findDuplicateTransaction, type TransactionFingerprint } from "@/lib/financial/duplicate-detection";
import { replayQuantity } from "@/lib/financial/holdings-quantity";

export class TransactionNotFoundError extends Error {
  constructor() {
    super("העסקה לא נמצאה או שאין לך הרשאה לגשת אליה");
    this.name = "TransactionNotFoundError";
  }
}

export class SellExceedsHoldingsError extends Error {
  constructor(available: number, requested: number) {
    super(
      `לא ניתן למכור ${requested} יחידות — מוחזקות ${available} בלבד בתיק (נכון לתאריך העסקה)`,
    );
    this.name = "SellExceedsHoldingsError";
  }
}

export class DuplicateTransactionError extends Error {
  constructor(public existingId: string) {
    super("נמצאה עסקה זהה קיימת בתיק (אותו נייר, סוג, תאריך, כמות, מחיר ומטבע)");
    this.name = "DuplicateTransactionError";
  }
}

export interface TransactionFilters {
  type?: TransactionType;
  securityId?: string;
  dateFrom?: string;
  dateTo?: string;
  /** Matches against security ticker/name or the transaction's notes. */
  search?: string;
  sortBy?: "date" | "type" | "quantity" | "price";
  sortDir?: "asc" | "desc";
}

async function requireOwnedPortfolio(userId: string, portfolioId: string) {
  const portfolio = await getPortfolioForUser(userId, portfolioId);
  if (!portfolio) throw new PortfolioNotFoundError();
  return portfolio;
}

export async function listTransactionsForPortfolio(
  userId: string,
  portfolioId: string,
  filters: TransactionFilters = {},
) {
  await requireOwnedPortfolio(userId, portfolioId);

  const where: Prisma.TransactionWhereInput = { portfolioId };
  if (filters.type) where.transactionType = filters.type;
  if (filters.securityId) where.securityId = filters.securityId;
  if (filters.dateFrom || filters.dateTo) {
    where.date = {
      ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
      ...(filters.dateTo ? { lte: new Date(filters.dateTo) } : {}),
    };
  }
  if (filters.search) {
    where.OR = [
      { notes: { contains: filters.search, mode: "insensitive" } },
      { security: { ticker: { contains: filters.search, mode: "insensitive" } } },
      { security: { name: { contains: filters.search, mode: "insensitive" } } },
    ];
  }

  const sortBy = filters.sortBy ?? "date";
  const sortDir = filters.sortDir ?? "desc";
  const orderByField = sortBy === "type" ? "transactionType" : sortBy;

  return db.transaction.findMany({
    where,
    include: { security: true },
    orderBy: { [orderByField]: sortDir },
  });
}

export async function getTransactionForUser(userId: string, transactionId: string) {
  const transaction = await db.transaction.findUnique({
    where: { id: transactionId },
    include: { security: true, portfolio: true },
  });
  if (!transaction || transaction.portfolio.userId !== userId) {
    throw new TransactionNotFoundError();
  }
  return transaction;
}

/**
 * Quantity held in `securityId` as of (and including) `asOfDate`. Used to
 * validate a new SELL — unlike the read-time portfolioEngine (which caps
 * and warns to stay robust against messy historical data), a write we
 * control should fail loudly instead of silently capping (spec §18 "Sell
 * greater than holding"). The actual replay math lives in
 * lib/financial/holdings-quantity.ts so it's unit-testable without a DB.
 */
async function getQuantityAsOfDate(
  portfolioId: string,
  securityId: string,
  asOfDate: Date,
  excludeTransactionId?: string,
): Promise<number> {
  const transactions = await db.transaction.findMany({
    where: {
      portfolioId,
      securityId,
      transactionType: { in: ["BUY", "SELL"] },
      date: { lte: asOfDate },
      ...(excludeTransactionId ? { id: { not: excludeTransactionId } } : {}),
    },
    orderBy: { date: "asc" },
  });

  return replayQuantity(
    transactions.map((tx) => ({
      type: tx.transactionType as "BUY" | "SELL",
      date: tx.date.toISOString().slice(0, 10),
      quantity: tx.quantity?.toNumber() ?? 0,
    })),
  );
}

function toFingerprint(input: TransactionInput): TransactionFingerprint {
  return {
    securityId: "securityId" in input ? input.securityId ?? null : null,
    type: input.type,
    date: input.date.slice(0, 10),
    quantity: "quantity" in input ? input.quantity ?? null : null,
    price: input.price ?? null,
    currency: input.currency,
  };
}

async function findDuplicate(input: TransactionInput, excludeId?: string) {
  const dayStart = new Date(`${input.date.slice(0, 10)}T00:00:00.000Z`);
  const dayEnd = new Date(`${input.date.slice(0, 10)}T23:59:59.999Z`);
  const securityId = "securityId" in input ? input.securityId ?? null : null;

  const candidates = await db.transaction.findMany({
    where: {
      portfolioId: input.portfolioId,
      transactionType: input.type,
      securityId,
      date: { gte: dayStart, lte: dayEnd },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });

  const match = findDuplicateTransaction(
    toFingerprint(input),
    candidates.map((c) => ({
      id: c.id,
      securityId: c.securityId,
      type: c.transactionType,
      date: c.date.toISOString().slice(0, 10),
      quantity: c.quantity?.toNumber() ?? null,
      price: c.price?.toNumber() ?? null,
      currency: c.currency,
    })),
  );

  return match ? candidates.find((c) => c.id === match.id) : undefined;
}

export interface CreateTransactionOptions {
  /** Skip the duplicate-fingerprint guard (user confirmed "import/save anyway"). */
  force?: boolean;
}

export async function createTransaction(
  userId: string,
  input: TransactionInput,
  options: CreateTransactionOptions = {},
) {
  await requireOwnedPortfolio(userId, input.portfolioId);

  if (!options.force) {
    const duplicate = await findDuplicate(input);
    if (duplicate) throw new DuplicateTransactionError(duplicate.id);
  }

  if (input.type === "SELL") {
    const available = await getQuantityAsOfDate(
      input.portfolioId,
      input.securityId,
      new Date(input.date),
    );
    if (input.quantity > available) {
      throw new SellExceedsHoldingsError(available, input.quantity);
    }
  }

  const securityId = "securityId" in input ? input.securityId ?? null : null;
  const quantity = "quantity" in input ? input.quantity ?? null : null;

  return db.transaction.create({
    data: {
      portfolioId: input.portfolioId,
      securityId,
      transactionType: input.type,
      date: new Date(input.date),
      quantity,
      price: input.price,
      currency: input.currency,
      fees: input.fees,
      tax: input.tax,
      notes: input.notes,
    },
  });
}

export async function updateTransaction(
  userId: string,
  transactionId: string,
  input: TransactionInput,
  options: CreateTransactionOptions = {},
) {
  const existing = await getTransactionForUser(userId, transactionId);
  await requireOwnedPortfolio(userId, input.portfolioId);

  if (!options.force) {
    const duplicate = await findDuplicate(input, transactionId);
    if (duplicate) throw new DuplicateTransactionError(duplicate.id);
  }

  if (input.type === "SELL") {
    const available = await getQuantityAsOfDate(
      input.portfolioId,
      input.securityId,
      new Date(input.date),
      transactionId,
    );
    if (input.quantity > available) {
      throw new SellExceedsHoldingsError(available, input.quantity);
    }
  }

  const securityId = "securityId" in input ? input.securityId ?? null : null;
  const quantity = "quantity" in input ? input.quantity ?? null : null;

  void existing;

  return db.transaction.update({
    where: { id: transactionId },
    data: {
      securityId,
      transactionType: input.type,
      date: new Date(input.date),
      quantity,
      price: input.price,
      currency: input.currency,
      fees: input.fees,
      tax: input.tax,
      notes: input.notes,
    },
  });
}

export async function deleteTransaction(userId: string, transactionId: string) {
  const existing = await getTransactionForUser(userId, transactionId);
  await db.transaction.delete({ where: { id: existing.id } });
}
