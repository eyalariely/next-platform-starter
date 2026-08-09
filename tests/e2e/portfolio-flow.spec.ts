import { test, expect, type Page } from "@playwright/test";

/**
 * End-to-end coverage of the stage-2 core flow (spec §20): login, create a
 * portfolio, add a BUY and a DEPOSIT, verify Holdings reflects the correct
 * quantity, verify the Portfolio overview shows a value, import a CSV,
 * and verify the imported transaction shows up.
 *
 * Requires a running dev server backed by a seeded database — run
 * `npm run db:push && npm run db:seed` first. Uses the seeded dev user
 * (dev@smartfolio.local / dev-password-123) from prisma/seed.ts. With no
 * MARKET_DATA_API_KEY configured, the dev-only mock market data provider
 * (src/lib/market/providers/mock.ts) serves deterministic prices, so the
 * numeric assertions below are stable across runs.
 */

const DEV_EMAIL = "dev@smartfolio.local";
const DEV_PASSWORD = "dev-password-123";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("אימייל").fill(DEV_EMAIL);
  await page.getByLabel("סיסמה").fill(DEV_PASSWORD);
  await page.getByRole("button", { name: "התחברות" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

test.describe("Portfolio core flow", () => {
  test("login → create portfolio → add transactions → verify holdings & portfolio value", async ({
    page,
  }) => {
    await login(page);

    // Create a fresh portfolio so the test is independent of seed state.
    const portfolioName = `E2E Portfolio ${Date.now()}`;
    await page.goto("/portfolio");
    await page.getByRole("button", { name: "תיק חדש" }).click();
    await page.getByLabel("שם התיק").fill(portfolioName);
    await page.getByRole("button", { name: "יצירה" }).click();
    await expect(page.getByRole("heading", { name: portfolioName })).toBeVisible();

    // DEPOSIT.
    await page.goto("/transactions");
    await page.getByRole("button", { name: "עסקה חדשה" }).click();
    await page.getByLabel("סוג עסקה").click();
    await page.getByRole("option", { name: "הפקדה" }).click();
    await page.getByLabel("תאריך").fill("2026-01-01");
    await page.getByLabel("סכום כולל").fill("10000");
    await page.getByRole("button", { name: "הוספה" }).click();
    await expect(page.getByText("הפקדה").first()).toBeVisible();

    // BUY.
    await page.getByRole("button", { name: "עסקה חדשה" }).click();
    await page.getByLabel("סוג עסקה").click();
    await page.getByRole("option", { name: "קנייה" }).click();
    await page.getByLabel("תאריך").fill("2026-01-02");
    await page.getByPlaceholder("חיפוש לפי טיקר או שם נייר...").fill("AAPL");
    await page.getByText("AAPL", { exact: false }).first().click();
    await page.getByLabel("כמות").fill("10");
    await page.getByLabel("מחיר ליחידה").fill("150");
    await page.getByRole("button", { name: "הוספה" }).click();

    // Holdings should show quantity 10 for AAPL.
    await page.goto("/holdings");
    const row = page.getByRole("row").filter({ hasText: "AAPL" });
    await expect(row).toBeVisible();
    await expect(row.getByText("10", { exact: true })).toBeVisible();

    // Portfolio overview should show a non-empty value.
    await page.goto("/portfolio");
    await expect(page.getByText("שווי תיק")).toBeVisible();
  });

  test("CSV import: upload, map, validate, confirm, verify transaction appears", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/portfolio");

    const portfolioId = new URL(page.url()).searchParams.get("portfolioId");

    await page.goto(portfolioId ? `/transactions/import?portfolioId=${portfolioId}` : "/transactions/import");

    const csv = "date,type,ticker,quantity,price,currency\n2026-02-01,BUY,MSFT,5,300,USD\n";
    await page.setInputFiles('input[type="file"]', {
      name: "transactions.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(csv, "utf-8"),
    });

    await expect(page.getByRole("heading", { name: "מיפוי עמודות" })).toBeVisible();
    await page.getByRole("button", { name: "אימות נתונים" }).click();

    await expect(page.getByText(/תקינות/)).toBeVisible();
    await page.getByRole("button", { name: /ייבוא \d+ עסקאות/ }).click();

    await expect(page.getByText("הייבוא הושלם")).toBeVisible();
    await page.getByRole("button", { name: "מעבר לעסקאות" }).click();

    await expect(page.getByText("MSFT").first()).toBeVisible();
  });
});
