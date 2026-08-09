import "server-only";

import type { Prisma, SecurityType } from "@prisma/client";

import { db } from "@/lib/db";
import { getMarketDataProvider } from "@/lib/market/provider";
import type { SecuritySearchResult } from "@/lib/market/types";

export class SecurityNotFoundError extends Error {
  constructor(query: string) {
    super(`לא נמצא נייר ערך תואם עבור "${query}" מול ספק נתוני השוק`);
    this.name = "SecurityNotFoundError";
  }
}

export interface SecuritySearchItem {
  id: string | null; // null = not yet in our DB (provider-only result)
  ticker: string;
  name: string;
  exchange: string;
  currency: string;
  securityType: SecurityType;
}

const RAW_TYPE_MAP: Record<string, SecurityType> = {
  equity: "EQUITY",
  "common stock": "EQUITY",
  stock: "EQUITY",
  etf: "ETF",
  "mutual fund": "MUTUAL_FUND",
  fund: "MUTUAL_FUND",
  bond: "BOND",
  cryptocurrency: "CRYPTO",
  crypto: "CRYPTO",
  cash: "CASH",
};

function mapSecurityType(rawType: string | undefined): SecurityType {
  if (!rawType) return "OTHER";
  return RAW_TYPE_MAP[rawType.trim().toLowerCase()] ?? "OTHER";
}

/**
 * Searches for a security both in our own Security table (instant, and
 * reflects what other users have already validated) and via the
 * MarketDataProvider (covers anything not yet in our DB). Never
 * fabricates a result — provider failures are swallowed into an empty
 * provider-side result set rather than surfacing a raw API error to a
 * search box (spec §18), while local DB results still come back.
 */
export async function searchSecurities(query: string): Promise<SecuritySearchItem[]> {
  const trimmed = query.trim();
  if (trimmed.length < 1) return [];

  const local = await db.security.findMany({
    where: {
      OR: [
        { ticker: { contains: trimmed, mode: "insensitive" } },
        { name: { contains: trimmed, mode: "insensitive" } },
      ],
    },
    take: 20,
    orderBy: { ticker: "asc" },
  });

  const localItems: SecuritySearchItem[] = local.map((s) => ({
    id: s.id,
    ticker: s.ticker,
    name: s.name,
    exchange: s.exchange,
    currency: s.currency,
    securityType: s.securityType,
  }));

  let providerResults: SecuritySearchResult[] = [];
  try {
    providerResults = await getMarketDataProvider().searchSecurity(trimmed);
  } catch {
    // Provider errors (rate limit, network, not configured) degrade to
    // "no additional results" rather than breaking the search UI.
    providerResults = [];
  }

  const knownKeys = new Set(localItems.map((i) => `${i.ticker}:${i.exchange}`));
  const providerItems: SecuritySearchItem[] = providerResults
    .filter((r) => !knownKeys.has(`${r.ticker}:${r.exchange}`))
    .map((r) => ({
      id: null,
      ticker: r.ticker,
      name: r.name,
      exchange: r.exchange,
      currency: r.currency,
      securityType: mapSecurityType(r.rawType),
    }));

  return [...localItems, ...providerItems].slice(0, 25);
}

/**
 * Returns the Security row for (ticker, exchange), creating it first if
 * necessary — but ONLY after confirming it against the MarketDataProvider
 * (spec §4: "אם נייר עדיין לא קיים: צור אותו רק לאחר אימות מול
 * MarketDataProvider... אל תיצור Security פיקטיבי").
 */
export async function findOrCreateSecurity(
  ticker: string,
  exchange: string,
): Promise<{ id: string; ticker: string; name: string; currency: string }> {
  const normalizedTicker = ticker.trim().toUpperCase();

  const existing = await db.security.findUnique({
    where: { ticker_exchange: { ticker: normalizedTicker, exchange } },
  });
  if (existing) return existing;

  const matches = await getMarketDataProvider().searchSecurity(normalizedTicker);
  const match = matches.find(
    (m) => m.ticker.toUpperCase() === normalizedTicker && (!exchange || m.exchange === exchange),
  ) ?? matches.find((m) => m.ticker.toUpperCase() === normalizedTicker);

  if (!match) {
    throw new SecurityNotFoundError(normalizedTicker);
  }

  const data: Prisma.SecurityCreateInput = {
    ticker: normalizedTicker,
    name: match.name,
    exchange: match.exchange || exchange || "UNKNOWN",
    currency: match.currency,
    securityType: mapSecurityType(match.rawType),
  };

  return db.security.create({ data });
}

export function getSecurityByTicker(ticker: string) {
  return db.security.findFirst({
    where: { ticker: ticker.trim().toUpperCase() },
  });
}

export function getSecurityById(id: string) {
  return db.security.findUnique({ where: { id } });
}
