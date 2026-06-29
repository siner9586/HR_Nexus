import { expect, test } from "@playwright/test";

test("employee menu differs from HR", async ({ page }) => {
  await page.goto("/login");
  await page.getByText("普通员工演示登录").click();
  await expect(page).toHaveURL(/dashboard|payslips/);
  await page.goto("/payroll");
  await expect(page.getByText("薪资管理")).toBeVisible();
});
