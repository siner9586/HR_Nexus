import "dotenv/config";

const env = process.env;
const isProduction = env.NODE_ENV === "production";
const isBillingMock = env.BILLING_MOCK_MODE !== "false";

type Check = {
  key: string;
  required: boolean;
  valid?: boolean;
  message?: string;
};

function present(key: string) {
  return Boolean(env[key] && String(env[key]).trim().length > 0);
}

const checks: Check[] = [
  { key: "DATABASE_URL", required: true },
  { key: "DIRECT_URL", required: true },
  { key: "NEXTAUTH_SECRET", required: true, valid: present("NEXTAUTH_SECRET") && String(env.NEXTAUTH_SECRET).length >= 32, message: "must be at least 32 characters" },
  { key: "NEXTAUTH_URL", required: true },
  { key: "APP_URL", required: true },
  { key: "NODE_ENV", required: true, valid: env.NODE_ENV === "production", message: "must be production for production checks" },
  { key: "BILLING_MOCK_MODE", required: true },
  { key: "STRIPE_SECRET_KEY", required: !isBillingMock },
  { key: "STRIPE_WEBHOOK_SECRET", required: !isBillingMock },
  { key: "UPLOAD_PROVIDER", required: true },
  { key: "ADMIN_EMAIL", required: true },
  { key: "ADMIN_PASSWORD", required: true, valid: !isProduction || (present("ADMIN_PASSWORD") && String(env.ADMIN_PASSWORD).length >= 12 && env.ADMIN_PASSWORD !== "Admin123456!"), message: "must be set, at least 12 chars, and not the demo password" },
  { key: "ADMIN_NAME", required: true },
  { key: "SENTRY_DSN", required: false },
];

if (!isBillingMock) {
  checks.push(
    { key: "STRIPE_PRICE_STANDARD_MONTHLY", required: true },
    { key: "STRIPE_PRICE_STANDARD_YEARLY", required: true },
    { key: "STRIPE_PRICE_PROFESSIONAL_MONTHLY", required: true },
    { key: "STRIPE_PRICE_PROFESSIONAL_YEARLY", required: true },
    { key: "STRIPE_PRICE_ENTERPRISE_MONTHLY", required: true },
    { key: "STRIPE_PRICE_ENTERPRISE_YEARLY", required: true },
  );
}

const failures = checks.filter((check) => {
  if (check.required && !present(check.key)) return true;
  if (check.valid === false) return true;
  return false;
});

if (isProduction && env.DEMO_LOGIN_ENABLED !== "false") {
  failures.push({ key: "DEMO_LOGIN_ENABLED", required: true, message: "must be false in production unless this is an explicit staging/demo deployment" });
}

if (failures.length) {
  console.error("Production environment check failed:");
  for (const failure of failures) {
    console.error(`- ${failure.key}${failure.message ? `: ${failure.message}` : ": missing"}`);
  }
  process.exit(1);
}

console.log("Production environment check passed.");
