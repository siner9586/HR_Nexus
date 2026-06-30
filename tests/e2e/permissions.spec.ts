import { expect, test } from "@playwright/test";
import { login, productionSmoke } from "./helpers";

test("employee menu differs from HR", async ({ page }) => {
  test.skip(productionSmoke, "Tenant demo data is not loaded in production minimal seed");
  await login(page, "employee");
  await expect(page).toHaveURL(/dashboard|payslips/);
  await page.goto("/payroll");
  await expect(page).toHaveURL(/dashboard/);
  await page.goto("/payslips");
  await expect(page.getByRole("heading", { name: "工资条" })).toBeVisible();
});
