const baseUrl = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";

async function api(path: string, init?: RequestInit) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const cookie = response.headers.get("set-cookie");
  const json = await response.json();
  return { response, json, cookie };
}

async function main() {
  const login = await api("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "owner@demo.com", password: "Demo123456!" }),
  });
  if (!login.json.success) throw new Error("Login smoke failed");
  const cookie = login.cookie?.split(";")[0] ?? "";

  for (const path of ["/api/auth/me", "/api/employees", "/api/contracts", "/api/analytics/dashboard", "/api/billing/current"]) {
    const result = await api(path, { headers: { cookie } });
    if (!result.json.success) throw new Error(`Smoke failed for ${path}: ${JSON.stringify(result.json)}`);
  }

  const checkout = await api("/api/billing/checkout", {
    method: "POST",
    headers: { cookie },
    body: JSON.stringify({ planCode: "PROFESSIONAL", interval: "month" }),
  });
  if (!checkout.json.success || !checkout.json.data.url) throw new Error("Billing checkout smoke failed");

  console.log("Smoke tests passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
