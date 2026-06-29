import { expect, test } from "@playwright/test";

test("employees list and detail open", async ({ page }) => {
  await page.goto("/login");
  await page.getByText("HR 专员演示登录").click();
  await expect(page).toHaveURL(/dashboard/);
  await page.goto("/employees");
  await expect(page.getByRole("heading", { name: "员工档案" })).toBeVisible();
});
