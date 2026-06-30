import { expect, test } from "@playwright/test";
import { login, productionSmoke } from "./helpers";

test("dashboard opens", async ({ page }) => {
  test.skip(productionSmoke, "Tenant demo data is not loaded in production minimal seed");
  await login(page, "owner");
  await expect(page).toHaveURL(/dashboard/);
  await expect(page.getByRole("heading", { name: "工作台" })).toBeVisible();
});
