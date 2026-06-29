# Environment Variables

Never commit `.env`, `.env.local`, or production secrets.

## Core

| Variable | Required | Scope | Notes |
| --- | --- | --- | --- |
| `DATABASE_URL` | yes | local/staging/production | Runtime pooled Postgres URL. |
| `DIRECT_URL` | yes | local/staging/production | Direct Postgres URL for Prisma migrations. |
| `NEXTAUTH_SECRET` | yes | all | At least 32 chars. |
| `NEXTAUTH_URL` | yes | staging/production | Public app URL. |
| `APP_URL` | yes | all | Used for billing redirects. |
| `NEXT_PUBLIC_APP_URL` | optional | browser | Public URL when a client-visible URL is required. |
| `NODE_ENV` | yes | production | Vercel sets `production`. |
| `APP_VERSION` | optional | all | Defaults to `1.0.0`. |
| `VERCEL_GIT_COMMIT_SHA` | auto | Vercel | Provided by Vercel. |

## Demo and admin

| Variable | Required | Notes |
| --- | --- | --- |
| `DEMO_LOGIN_ENABLED` | yes | Must be `false` in production unless explicitly staging. |
| `DEMO_SEED` | optional | Must be `true` to run demo seed in production-like env. |
| `ADMIN_EMAIL` | seed | Required for production minimal seed. |
| `ADMIN_PASSWORD` | seed | Required, strong, never use demo password in production. |
| `ADMIN_NAME` | seed | Required for production minimal seed. |

## Billing

| Variable | Required | Notes |
| --- | --- | --- |
| `BILLING_MOCK_MODE` | yes | `true` for mock-compatible deployment. |
| `STRIPE_SECRET_KEY` | when mock=false | Test/live secret key. |
| `STRIPE_WEBHOOK_SECRET` | when mock=false | Required for signature verification. |
| `STRIPE_PRICE_STANDARD_MONTHLY` | when mock=false | Server trusted price ID. |
| `STRIPE_PRICE_STANDARD_YEARLY` | when mock=false | Server trusted price ID. |
| `STRIPE_PRICE_PROFESSIONAL_MONTHLY` | when mock=false | Server trusted price ID. |
| `STRIPE_PRICE_PROFESSIONAL_YEARLY` | when mock=false | Server trusted price ID. |
| `STRIPE_PRICE_ENTERPRISE_MONTHLY` | when mock=false | Server trusted price ID. |
| `STRIPE_PRICE_ENTERPRISE_YEARLY` | when mock=false | Server trusted price ID. |

## Uploads, mail, observability, AI

| Variable | Required | Notes |
| --- | --- | --- |
| `UPLOAD_PROVIDER` | yes | `local` is not durable on Vercel. Use `r2`, `s3`, or `minio` for production uploads. |
| `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET` | when S3/MinIO | Object storage. |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` | when R2 | Cloudflare R2. |
| `EMAIL_SERVER`, `EMAIL_FROM` | optional | Email delivery. |
| `SENTRY_DSN` | optional | Error monitoring. |
| `AI_PROVIDER`, `OPENAI_API_KEY` | optional | AI reserved. |
| `MAINTENANCE_MODE` | optional | Reserved emergency flag. |
| `MAX_PAGE_SIZE` | optional | Defaults to 100 in app behavior. |
| `EXPORT_ENABLED` | optional | Reserved export control flag. |

## Smoke and Postman

| Variable | Required | Notes |
| --- | --- | --- |
| `BASE_URL` | optional | Overrides local smoke and Postman target. |
| `SMOKE_BASE_URL` | optional | Backward-compatible local smoke target. |
| `PRODUCTION_BASE_URL` | optional | Overrides production smoke target; defaults to `https://hr-nexus-hazel.vercel.app`. |
| `SMOKE_EMAIL`, `SMOKE_PASSWORD` | optional | Optional authenticated smoke credentials. Do not commit them. |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | optional | Used by production smoke only when explicit login verification is needed. |

Local smoke defaults to `http://127.0.0.1:3000` to avoid localhost IPv6/proxy ambiguity. Production smoke defaults to `https://hr-nexus-hazel.vercel.app`.

## Production URL

Set these in Vercel production:

```text
NEXTAUTH_URL=https://hr-nexus-hazel.vercel.app
APP_URL=https://hr-nexus-hazel.vercel.app
```

Do not commit `.env`, `.env.local`, database URLs, Stripe secrets, webhook secrets, R2 credentials, or Sentry DSNs.
