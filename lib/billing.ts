import type { TenantPlan } from "@prisma/client";
import { PLAN_LIMITS } from "./constants";
import { prisma } from "./db";
import { getStripeClient, isBillingMockMode, stripePriceEnv } from "./stripe";

export async function getBillingOverview(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      subscriptions: { include: { plan: true }, orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!tenant) return null;
  const employeeCount = await prisma.employee.count({ where: { tenantId } });
  const current = tenant.subscriptions[0];
  const limit = PLAN_LIMITS[tenant.plan];
  return {
    tenant,
    plan: current?.plan ?? null,
    subscription: current ?? null,
    usage: {
      employees: employeeCount,
      maxEmployees: limit.maxEmployees,
      storageGB: Math.min(Math.round(employeeCount * 0.03 * 10) / 10, limit.storageGB),
      maxStorageGB: limit.storageGB,
      aiCredits: tenant.plan === "PROFESSIONAL" ? 300 : tenant.plan === "ENTERPRISE" ? 1000 : 0,
    },
    mockMode: isBillingMockMode(),
  };
}

export async function createCheckoutSession(input: {
  tenantId: string;
  planCode: Exclude<TenantPlan, "FREE" | "PRIVATE_DEPLOYMENT">;
  interval: "month" | "year";
  appUrl: string;
}) {
  if (isBillingMockMode()) {
    return {
      url: `${input.appUrl}/billing/success?mock=true&plan=${input.planCode}&interval=${input.interval}`,
      mock: true,
    };
  }
  const stripe = getStripeClient();
  if (!stripe) throw new Error("Stripe is not configured");
  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: input.tenantId } });
  const price = stripePriceEnv(input.planCode, input.interval);
  if (!price) throw new Error(`Missing Stripe price for ${input.planCode} ${input.interval}`);
  const customer =
    tenant.stripeCustomerId ??
    (
      await stripe.customers.create({
        name: tenant.name,
        email: tenant.contactEmail ?? undefined,
        metadata: { tenantId: tenant.id },
      })
    ).id;
  if (!tenant.stripeCustomerId) {
    await prisma.tenant.update({ where: { id: tenant.id }, data: { stripeCustomerId: customer } });
  }
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer,
    line_items: [{ price, quantity: 1 }],
    success_url: `${input.appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${input.appUrl}/billing/cancel`,
    metadata: { tenantId: tenant.id, planCode: input.planCode },
    subscription_data: { metadata: { tenantId: tenant.id, planCode: input.planCode } },
  });
  return { url: session.url, mock: false };
}

export async function createPortalSession(input: { tenantId: string; appUrl: string }) {
  if (isBillingMockMode()) return { url: `${input.appUrl}/billing?mockPortal=true`, mock: true };
  const stripe = getStripeClient();
  if (!stripe) throw new Error("Stripe is not configured");
  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: input.tenantId } });
  if (!tenant.stripeCustomerId) throw new Error("Tenant has no Stripe customer");
  const session = await stripe.billingPortal.sessions.create({
    customer: tenant.stripeCustomerId,
    return_url: `${input.appUrl}/billing`,
  });
  return { url: session.url, mock: false };
}
