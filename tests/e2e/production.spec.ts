import { expect, test } from "@playwright/test";
import { login, productionSmoke } from "./helpers";

test.describe("production smoke", () => {
  test.skip(!productionSmoke, "Production smoke only runs when PLAYWRIGHT_PRODUCTION_SMOKE=true");
  test.setTimeout(90_000);

  test("home, login and platform admin page work", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /HR Nexus/ })).toBeVisible();
    await login(page);
    await expect(page).toHaveURL(/platform/);
    await expect(page.getByRole("heading", { name: "平台管理" })).toBeVisible();
  });
});
