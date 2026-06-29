import { expect, test } from "@playwright/test";

test("billing page opens", async ({ page }) => {
  await page.goto("/login");
  await page.getByText("企业所有者演示登录").click();
  await expect(page).toHaveURL(/dashboard/);
  await page.goto("/billing");
  await expect(page.getByRole("heading", { name: "计费与套餐" })).toBeVisible();
  await expect(page.getByText("mock billing mode")).toBeVisible();
});
