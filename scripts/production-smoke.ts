import "dotenv/config";
import { assertJsonSuccess, normalizeBaseUrl, smokeRequest } from "./smoke-utils";

const baseUrl = normalizeBaseUrl(
  process.env.PRODUCTION_BASE_URL ??
    process.env.BASE_URL ??
    process.env.SMOKE_BASE_URL ??
    process.env.APP_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "https://hr-nexus-hazel.vercel.app",
);
const email = process.env.SMOKE_EMAIL || process.env.ADMIN_EMAIL || "";
const password = process.env.SMOKE_PASSWORD || process.env.ADMIN_PASSWORD || "";

async function main() {
  for (const path of ["/api/health", "/api/version", "/", "/login"]) {
    const result = await smokeRequest(baseUrl, path, { retries: 3, timeoutMs: 12000, localHint: false });
    if (path.startsWith("/api/")) {
      assertJsonSuccess(path, result);
    } else if (!result.response.ok) {
      throw new Error(`${path} failed with ${result.response.status}`);
    }
  }
  console.log(`Production read-only smoke checks passed for ${baseUrl}.`);

  if (!email || !password) {
    console.log("Production smoke skipped authenticated checks because SMOKE_EMAIL/SMOKE_PASSWORD or ADMIN_EMAIL/ADMIN_PASSWORD are not set.");
    return;
  }

  const login = await smokeRequest(baseUrl, "/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
    retries: 3,
    timeoutMs: 12000,
    localHint: false,
  });
  assertJsonSuccess("login", login);
  const cookie = login.cookie;

  const me = await smokeRequest(baseUrl, "/api/auth/me", { headers: { cookie }, retries: 3, timeoutMs: 12000, localHint: false });
  assertJsonSuccess("/api/auth/me", me);
  const meBody = me.body as { data?: { user?: { tenantId?: string } } };
  const tenantId = meBody.data?.user?.tenantId;
  const protectedPaths = tenantId ? ["/api/employees", "/api/employees/export"] : ["/api/platform/overview", "/api/platform/tenants"];
  for (const path of protectedPaths) {
    const result = await smokeRequest(baseUrl, path, { headers: { cookie }, retries: 3, timeoutMs: 12000, localHint: false });
    if (path.endsWith("/export")) {
      const contentType = result.response.headers.get("content-type") ?? "";
      if (!result.response.ok || !contentType.includes("text/csv")) throw new Error(`${path} failed with ${result.response.status}`);
    } else {
      assertJsonSuccess(path, result);
    }
  }

  console.log(`Production smoke checks passed for ${baseUrl}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
