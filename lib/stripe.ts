import Stripe from "stripe";

export function isBillingMockMode() {
  return process.env.BILLING_MOCK_MODE !== "false" || !process.env.STRIPE_SECRET_KEY;
}

export function getStripeClient() {
  if (isBillingMockMode()) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-06-24.dahlia",
  });
}

export function stripePriceEnv(planCode: string, interval: "month" | "year") {
  const key = `STRIPE_PRICE_${planCode}_${interval === "month" ? "MONTHLY" : "YEARLY"}`;
  return process.env[key];
}
