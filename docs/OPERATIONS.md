# Operations

## Daily checks

```bash
curl https://hr-nexus-hazel.vercel.app/api/health
curl https://hr-nexus-hazel.vercel.app/api/version
vercel logs hr-nexus-hazel.vercel.app --scope githubcomsiner9586excavator
```

If Node fetch smoke fails with `ECONNRESET` but curl/browser checks return 200, record it as a local network/proxy limitation and verify Vercel runtime logs before treating it as a deployment failure.

## Local startup and smoke

```bash
npm install
npm run db:generate
npm run build
PORT=3000 npm run start
```

In another shell:

```bash
BASE_URL=http://127.0.0.1:3000 npm run smoke
```

If the local server is not running, `npm run smoke` should fail with: `请先运行 npm run start 或 npm run dev`.

## Database operations

Production schema changes must be committed as Prisma migrations and deployed with:

```bash
npm run db:migrate:deploy
```

Do not run `prisma migrate reset` or `prisma db push` against production.

Production minimal seed:

```bash
NODE_ENV=production ADMIN_EMAIL=... ADMIN_PASSWORD=... ADMIN_NAME=... npm run db:seed:minimal
```

Staging/demo seed:

```bash
DEMO_SEED=true npm run db:seed:demo
```

Production keeps only the minimal seed by default. The preview branch currently has a partial demo seed, which is enough for preview validation but should not be treated as a complete production data set.

## Admin operations

Create or rotate the platform admin:

```bash
NODE_ENV=production ADMIN_EMAIL=... ADMIN_PASSWORD=... ADMIN_NAME=... npm run create-admin
```

The production password used during initial seed must be rotated before real customer use.

## Vercel operations

- Project: `githubcomsiner9586excavator/hr-nexus`
- Production URL: `https://hr-nexus-hazel.vercel.app`
- Disable public protection when needed:

```bash
vercel projects protection disable hr-nexus --sso --scope githubcomsiner9586excavator
```

- Production deploy:

```bash
vercel deploy --prod --scope githubcomsiner9586excavator
```

## Neon operations

Use Neon Console to monitor:

- connection count
- storage growth
- slow queries
- branch status
- restore points

Before production migrations, record migration status and ensure Neon restore/branch rollback is available.

## Stripe operations

Current billing is mock mode. Before enabling real Stripe test/live mode:

- create products and recurring prices
- set all `STRIPE_PRICE_*` variables
- set `STRIPE_SECRET_KEY`
- set `STRIPE_WEBHOOK_SECRET`
- set `BILLING_MOCK_MODE=false`
- register webhook endpoint `/api/billing/webhook`
- run `npm run smoke:production` against Stripe test mode before live mode

## File storage operations

Cloudflare R2 is not enabled for the current account. Enable R2 in the Cloudflare Dashboard first, then create the bucket and set `UPLOAD_PROVIDER=r2` plus the `R2_*` variables in Vercel. Do not block production readiness on R2 creation until the account is enabled.

## Sentry operations

Set `SENTRY_DSN` in Vercel after creating a Sentry Next.js project. Do not send passwords, tokens, salary details, ID numbers, or bank data as Sentry context.

## Postman operations

```bash
BASE_URL=http://127.0.0.1:3000 npm run postman:test:local
BASE_URL=https://hr-nexus-staging.vercel.app npm run postman:test:staging
BASE_URL=https://hr-nexus-hazel.vercel.app npm run postman:test:production
```

Production Postman environments intentionally contain no passwords. Enter operator-owned credentials locally when authenticated production checks are required.
