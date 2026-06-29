import { expect, test } from "@playwright/test";

test("demo owner can log in", async ({ page }) => {
  await page.goto("/login");
  await page.getByText("企业所有者演示登录").click();
  await expect(page).toHaveURL(/dashboard|platform/);
});
