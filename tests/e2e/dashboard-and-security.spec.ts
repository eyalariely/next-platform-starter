import { test, expect } from "@playwright/test";

/**
 * Stage-3 smoke coverage: dashboard renders its performance/benchmark
 * sections, and a holding row opens into the full security analysis page
 * with a working deep link (no 404 on refresh).
 *
 * Requires a running dev server backed by a seeded + populated database
 * (see tests/e2e/portfolio-flow.spec.ts for the seed credentials). Not
 * executed live in this sandbox — no DATABASE_URL available.
 */

const DEV_EMAIL = "dev@smartfolio.local";
const DEV_PASSWORD = "dev-password-123";

test("dashboard shows performance chart and benchmark comparison", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("אימייל").fill(DEV_EMAIL);
  await page.getByLabel("סיסמה").fill(DEV_PASSWORD);
  await page.getByRole("button", { name: "התחברות" }).click();

  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByText("ביצועי התיק")).toBeVisible();
  await expect(page.getByText("תיק מול Benchmark")).toBeVisible();
  await expect(page.getByText("מצב איכות הנתונים")).toBeVisible();
});

test("holdings row opens the security page via deep link, and refresh doesn't 404", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("אימייל").fill(DEV_EMAIL);
  await page.getByLabel("סיסמה").fill(DEV_PASSWORD);
  await page.getByRole("button", { name: "התחברות" }).click();

  await page.goto("/holdings");
  const firstTicker = page.locator('a[href^="/securities/"]').first();
  await expect(firstTicker).toBeVisible();
  const href = await firstTicker.getAttribute("href");
  await firstTicker.click();

  await expect(page).toHaveURL(new RegExp(href!.replace(/[/]/g, "\\/")));
  await expect(page.getByText("גרף מחיר")).toBeVisible();

  await page.reload();
  await expect(page.getByText("גרף מחיר")).toBeVisible();
});
