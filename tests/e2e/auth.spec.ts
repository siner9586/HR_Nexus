import { expect, test } from "@playwright/test";
import { login, productionSmoke } from "./helpers";

test("demo owner can log in", async ({ page }) => {
  test.skip(productionSmoke, "Covered by production smoke test");
  await login(page, "owner");
  await expect(page).toHaveURL(/dashboard|platform/);
});
