import { expect, test } from "@playwright/test";

test("dashboard opens", async ({ page }) => {
  await page.goto("/login");
  await page.getByText("企业所有者演示登录").click();
  await expect(page).toHaveURL(/dashboard/);
  await expect(page.getByRole("heading", { name: "工作台" })).toBeVisible();
});
