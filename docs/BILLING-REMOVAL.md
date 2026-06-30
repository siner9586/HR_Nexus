# Billing Removal

HR Nexus V1.0 has removed the in-product Billing and Stripe implementation.

Removed runtime surfaces:

- app/billing pages
- app/api/billing routes
- components/billing UI
- lib/billing.ts
- lib/stripe.ts
- Stripe dependency and package lock entry
- Billing folders and requests in Postman
- Plan, Subscription, Invoice and BillingEvent Prisma models
- Tenant billing fields and Stripe identifiers

The product is now positioned for internal enterprise deployment, private deployment and project delivery. Historical references should remain only in this file for audit context.
