import { test, expect } from "@playwright/test";

// Smoke test for the stage-1 scaffold: unauthenticated visitors are bounced
// to /login, and the RTL login form renders. Full auth/portfolio E2E flows
// (spec §59) land once a seeded database is available in CI (stage 11).
test("redirects unauthenticated visitors to the login page", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("heading", { name: "התחברות" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
});
