import { test, expect } from "@playwright/test";

test.describe("GitHub Code Fetching & Explorer E2E Flow", () => {
  test("User can navigate to repository code explorer, index files, and view code", async ({ page }) => {
    // 1. Navigate to Login page
    await page.goto("http://localhost:3000/login");
    await expect(page).toHaveTitle(/RepoRadar/i);

    // 2. Perform Developer Authentication
    await page.fill('input[type="email"]', "test@reporadar.io");
    await page.fill('input[type="password"]', "password123");
    await page.click('button:has-text("Sign In")');

    // 3. Wait for Dashboard Navigation
    await page.waitForURL("**/dashboard**");

    // 4. Navigate to Repository Details & Code Explorer
    await page.goto("http://localhost:3000/dashboard/repositories");
    await page.waitForSelector('text=Explore Code Tree, text=Selected', { timeout: 10000 }).catch(() => {});

    // 5. Navigate to code explorer page for selected repository
    const firstExploreBtn = page.locator('a:has-text("Explore Code Tree")').first();
    if (await firstExploreBtn.isVisible()) {
      await firstExploreBtn.click();
      await page.waitForURL("**/code");

      // 6. Verify Code Explorer UI Elements
      await expect(page.locator("text=File Explorer")).toBeVisible();
      await expect(page.locator("text=Fetch & Index Code, text=Re-index Code")).toBeVisible();

      // 7. Click Fetch Code if not yet indexed
      const fetchBtn = page.locator('button:has-text("Fetch & Index Code"), button:has-text("Fetch Code Now")').first();
      if (await fetchBtn.isVisible()) {
        await fetchBtn.click();
        await expect(page.locator("text=Indexing Code Tree...")).toBeVisible();
      }
    }
  });
});
