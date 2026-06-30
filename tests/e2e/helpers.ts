import type { Page } from "@playwright/test";

export const productionSmoke = process.env.PLAYWRIGHT_PRODUCTION_SMOKE === "true";

const demoButtons = {
  owner: "企业所有者演示登录",
  hr: "HR 专员演示登录",
  payroll: "薪酬专员演示登录",
  employee: "普通员工演示登录",
} as const;

export async function login(page: Page, account: keyof typeof demoButtons = "owner") {
  await page.goto("/login");
  if (process.env.PLAYWRIGHT_EMAIL && process.env.PLAYWRIGHT_PASSWORD) {
    const inputs = page.locator("input");
    await inputs.nth(0).fill(process.env.PLAYWRIGHT_EMAIL);
    await inputs.nth(1).fill(process.env.PLAYWRIGHT_PASSWORD);
    await page.getByRole("button", { name: /^登录$/ }).click();
    return;
  }
  await page.getByText(demoButtons[account]).click();
}
