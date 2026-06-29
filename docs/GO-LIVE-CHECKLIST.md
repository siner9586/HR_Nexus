# Go-Live Checklist

## Before go-live

- [x] Git working tree reviewed.
- [x] Prisma schema validates.
- [x] Prisma migration exists.
- [x] Production uses `prisma migrate deploy`.
- [x] Production minimal seed is separate from demo seed.
- [x] Preview demo seed status documented as partial demo seed.
- [x] Demo login disabled in production env.
- [x] Vercel env variables configured.
- [x] Neon production and preview branches created.
- [x] `/api/health` returns database `ok`.
- [x] `/api/version` returns app metadata.
- [x] Security headers configured.
- [x] Stripe webhook signature validation exists for non-mock mode.
- [x] Postman local/staging/production environments exist.
- [x] Rollback document exists.

## After go-live

- [x] Homepage public URL returns 200.
- [x] Login page public URL returns 200.
- [x] Production read-only smoke passed from current operator network.
- [ ] Production authenticated smoke pending operator-provided production credentials.
- [ ] Vercel runtime errors checked after final tag deployment.
- [ ] Rotate initial production platform admin password.
- [ ] Configure Sentry DSN.
- [ ] Enable durable file storage with R2/S3.
- [ ] Switch Stripe from mock mode to test mode when ready.

## Final validation commands

```bash
npm run db:validate
npm run db:generate
npm run typecheck
npm run lint
npm test
npm run build
BASE_URL=http://127.0.0.1:3000 npm run smoke
PRODUCTION_BASE_URL=https://hr-nexus-hazel.vercel.app npm run smoke:production
```

Production smoke is read-only unless `SMOKE_EMAIL`/`SMOKE_PASSWORD` or `ADMIN_EMAIL`/`ADMIN_PASSWORD` are explicitly provided for login verification.
