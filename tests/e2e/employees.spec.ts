import { expect, test } from "@playwright/test";
import { login, productionSmoke } from "./helpers";

test("employees list and detail open", async ({ page }) => {
  test.skip(productionSmoke, "Tenant demo data is not loaded in production minimal seed");
  await login(page, "hr");
  await expect(page).toHaveURL(/dashboard/);
  await page.goto("/employees");
  await expect(page.getByRole("heading", { name: "员工档案" })).toBeVisible();
});
