# Release Notes

## V1.0 production landing

Date: 2026-06-29

### Added

- Prisma migration `20260629000000_init_hr_nexus_v1`.
- Neon production and preview database branches.
- Vercel project and production deployment.
- `/api/health` and `/api/version`.
- Production minimal seed.
- Demo seed guard.
- Production env validation script.
- Production smoke script.
- Postman local/staging/production environments.
- Security headers.
- Demo login visibility control.
- Demo request model, API, and page.
- Production, operations, rollback, domain, environment, files, and go-live docs.

### Current production URL

https://hr-nexus-hazel.vercel.app

### Validation

- `npm run db:validate`
- `npm run db:generate`
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
- `BASE_URL=http://127.0.0.1:3000 npm run smoke`
- `PRODUCTION_BASE_URL=https://hr-nexus-hazel.vercel.app npm run smoke:production`

### Known limitations

- Stripe is mock mode.
- No real e-signature, enterprise IM integrations, or bank payroll integration.
- File storage is not durable on Vercel until R2/S3/MinIO is configured.
- AI is reserved only.
- Sentry DSN is reserved but not configured.
