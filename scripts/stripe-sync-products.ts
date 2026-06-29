import { prisma } from "@/lib/db";
import { getStripeClient, isBillingMockMode } from "@/lib/stripe";

if (isBillingMockMode()) {
  console.log("Stripe sync skipped: BILLING_MOCK_MODE=true or STRIPE_SECRET_KEY missing.");
  process.exit(0);
}

const stripe = getStripeClient();
if (!stripe) throw new Error("Stripe client unavailable");

const plans = await prisma.plan.findMany({ where: { code: { in: ["STANDARD", "PROFESSIONAL", "ENTERPRISE"] } } });
for (const plan of plans) {
  const product = await stripe.products.create({ name: `HR Nexus ${plan.name}`, metadata: { planCode: plan.code } });
  console.log(`Create product ${product.id} for ${plan.code}. Create prices in Dashboard and copy IDs to env.`);
}
