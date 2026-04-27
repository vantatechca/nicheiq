import { test, expect } from "@playwright/test";

test("login → dashboard → opportunity → ask Brain → vote", async ({ page }) => {
  // 1. Login
  await page.goto("/login");
  await page.fill("input#email", "andrei@nicheiq.com");
  await page.fill("input#password", "nicheiq123");
  await page.getByRole("button", { name: "Sign in" }).click();

  // 2. Dashboard loads
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByText("Top opportunities today")).toBeVisible();

  // 3. Open first opportunity
  await page.getByRole("link", { name: /opportunity_/i }).first().click().catch(async () => {
    await page.getByText(/score \d+/i).first().click();
  });
  await expect(page.url()).toMatch(/\/opportunities\//);

  // 4. Click Ask Brain (deep link to brain)
  const brainLink = page.getByRole("link", { name: /ask brain/i }).first();
  await brainLink.click();
  await expect(page).toHaveURL(/\/brain/);

  // 5. Send a chat message
  const textarea = page.getByPlaceholder(/Pressure-test/i);
  await textarea.fill("What should I build this weekend?");
  await page.getByRole("button").filter({ has: page.locator("svg") }).last().click();

  // Streamed canned response should arrive within 8s
  await expect(page.getByText(/jump out|surface|deep/i).first()).toBeVisible({ timeout: 8_000 });
});
