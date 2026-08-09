/**
 * Development-only seed (spec §60). Never runs against production data:
 * guarded below and only wired to `npm run db:seed`, which nothing in the
 * deploy pipeline invokes automatically.
 *
 * This seeds only account scaffolding (a dev login + an empty portfolio) —
 * it deliberately does NOT fabricate holdings, transactions, or prices.
 * Sample holdings (NVDA, QQQ, SPY, MSFT, AAPL per spec §60) get seeded once
 * the Transaction/MarketPrice pipeline exists (stage 2+), so the numbers
 * are real engine output rather than invented figures.
 */
import bcrypt from "bcryptjs";

import { db } from "../src/lib/db";

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to run the dev seed against a production environment.");
  }

  const email = "dev@smartfolio.local";
  const passwordHash = await bcrypt.hash("dev-password-123", 12);

  const user = await db.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: "Dev User",
      passwordHash,
    },
  });

  await db.portfolio.upsert({
    where: { id: `${user.id}-default` },
    update: {},
    create: {
      id: `${user.id}-default`,
      userId: user.id,
      name: "תיק לדוגמה",
      baseCurrency: "USD",
    },
  });

  console.log(`Seeded dev user: ${email} / dev-password-123`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
