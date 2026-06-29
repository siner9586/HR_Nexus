# HR Nexus Production

Last updated: 2026-06-29

## Current deployment

- Production URL: https://hr-nexus-hazel.vercel.app
- Vercel project: `githubcomsiner9586excavator/hr-nexus`
- Vercel project ID: `prj_Zwhv0UjmyL7tB9lqt0vxzDTp9YG5`
- Latest deployment ID: `dpl_D2pDXcrW27kAXaR6oudi3QoiDqxF`
- Production alias: `hr-nexus-hazel.vercel.app`
- Source branch: `release/production-landing-v1`
- Base V1 commit deployed by Vercel metadata: `941c60e8ba574b355c309229ba52b469310961ec`
- Deployment protection: SSO protection disabled for public access.

## Database

- Neon project: `HR_Nexus`
- Neon project ID: `weathered-sunset-91227227`
- Production branch: `main` / `br-royal-meadow-aj5mfnua`
- Preview branch: `preview` / `br-blue-block-ajqo0ky7`
- Database: `neondb`
- Production migration status: `20260629000000_init_hr_nexus_v1` applied.
- Production seed strategy: run only `npm run db:seed:minimal` after migrations and only when the platform admin/plans need bootstrapping.
- Production seed: minimal seed executed; do not rerun unless explicitly validating or rotating controlled bootstrap data.
- Production seed result: 1 platform admin, 0 business tenants, 5 plans.
- Preview seed result: migration applied; demo seed was interrupted after the first demo tenant due slow remote writes. Current preview state is partial demo seed: 1 tenant, 80 employees, 65 contracts, 10 users, 5 plans.

## Billing

- Current mode: `BILLING_MOCK_MODE=true`
- Stripe account observed: `acct_1TnUN1ImYWWfrQsJ`
- Stripe products/prices: not created by MCP because the available Stripe tools are read/search/planning only and Stripe CLI is not installed.
- Webhook route: `/api/billing/webhook`
- Webhook signature verification: implemented for non-mock mode.

Stripe test/live checklist:

1. Create Stripe products and recurring prices.
2. Set all `STRIPE_PRICE_*` variables for standard, professional, and enterprise monthly/yearly prices.
3. Set `STRIPE_SECRET_KEY` to the test or live secret key in the target environment.
4. Set `STRIPE_WEBHOOK_SECRET` for `/api/billing/webhook`.
5. Set `BILLING_MOCK_MODE=false`.
6. Run smoke against test mode before promoting live keys.

## Integrations

- Cloudflare R2: not enabled in the Cloudflare account. Enable R2 in the Dashboard before creating buckets or credentials.
- Sentry: `SENTRY_DSN` is reserved but not configured. Add the DSN in Vercel after creating a Sentry Next.js project.
- Postman: collection and local/staging/production environments live in `docs/postman`. Production defaults to `https://hr-nexus-hazel.vercel.app`.

## Validation

- `/api/health`: 200, database `ok`
- `/api/version`: 200, `HR Nexus` `1.0.0`
- Local validation commands: `npm run db:validate`, `npm run db:generate`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.
- Local smoke: start the app with `PORT=3000 npm run start`, then run `BASE_URL=http://127.0.0.1:3000 npm run smoke`.
- Production smoke: `PRODUCTION_BASE_URL=https://hr-nexus-hazel.vercel.app npm run smoke:production`.
- If `curl` returns 200 but Node fetch reports `ECONNRESET`, treat it as a local network/proxy limitation until Vercel logs or browser/curl checks contradict deployment health.

## Known limitations

- Production has no tenant demo data by design.
- Stripe is mock mode, so no real charge occurs.
- File uploads still use `UPLOAD_PROVIDER=local`; this is not persistent on Vercel serverless and should be switched to R2/S3 before customer file uploads.
- Sentry SDK is not installed because no DSN was available in this session.
- Vercel default domains may be unstable from some China mainland networks; no China mainland access SLA is claimed.

## Next steps

- Rotate the initial production platform admin password.
- Enable durable file storage with Cloudflare R2 after R2 is enabled in the Dashboard, or use S3-compatible storage.
- Configure Sentry and verify error reporting without sensitive HR data in event context.
- Move Stripe from mock mode to Stripe test mode before any live billing.
