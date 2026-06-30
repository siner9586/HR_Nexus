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

  for (const path of ["/api/auth/me", "/api/employees", "/api/contracts", "/api/analytics/dashboard"]) {
    const result = await smokeRequest(baseUrl, path, { headers: { cookie } });
    assertJsonSuccess(path, result);
  }

  for (const path of ["/api/employees/export", "/api/departments/export", "/api/contracts/export", "/api/leave/requests/export", "/api/recruitment/candidates/export", "/api/training/courses/export"]) {
    const result = await smokeRequest(baseUrl, path, { headers: { cookie } });
    const contentType = result.response.headers.get("content-type") ?? "";
    if (!result.response.ok || !contentType.includes("text/csv")) {
      throw new Error(`${path} export smoke failed with ${result.response.status}: ${contentType}`);
    }
  }

  console.log(`Smoke tests passed for ${baseUrl}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
