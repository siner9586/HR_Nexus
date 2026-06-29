import { assertJsonSuccess, normalizeBaseUrl, smokeRequest } from "./smoke-utils";

const baseUrl = normalizeBaseUrl(
  process.env.BASE_URL ?? process.env.SMOKE_BASE_URL ?? process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://127.0.0.1:3000",
);
const email = process.env.SMOKE_EMAIL ?? process.env.OWNER_EMAIL ?? "owner@demo.com";
const password = process.env.SMOKE_PASSWORD ?? process.env.OWNER_PASSWORD ?? "Demo123456!";

async function main() {
  for (const path of ["/api/health", "/api/version"]) {
    const result = await smokeRequest(baseUrl, path);
    assertJsonSuccess(path, result);
  }

  const login = await smokeRequest(baseUrl, "/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  assertJsonSuccess("login", login);
  const cookie = login.cookie;

  for (const path of ["/api/auth/me", "/api/employees", "/api/contracts", "/api/analytics/dashboard", "/api/billing/current"]) {
    const result = await smokeRequest(baseUrl, path, { headers: { cookie } });
    assertJsonSuccess(path, result);
  }

  const checkout = await smokeRequest(baseUrl, "/api/billing/checkout", {
    method: "POST",
    headers: { cookie },
    body: JSON.stringify({ planCode: "PROFESSIONAL", interval: "month" }),
  });
  const checkoutBody = checkout.body as { success?: boolean; data?: { url?: string } };
  if (!checkout.response.ok || checkoutBody.success !== true || !checkoutBody.data?.url) {
    throw new Error(`Billing checkout smoke failed with ${checkout.response.status}: ${JSON.stringify(checkout.body)}`);
  }

  console.log(`Smoke tests passed for ${baseUrl}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
