# Rollback

## Git rollback

Use a known good tag or commit:

```bash
git checkout main
git revert <bad-commit>
git push origin main
```

## Vercel rollback

Use Vercel Dashboard and promote a previous healthy deployment to production, or:

```bash
vercel rollback <deployment-url-or-id> --scope githubcomsiner9586excavator
curl https://hr-nexus-hazel.vercel.app/api/health
```

## Neon rollback

- Do not run `migrate reset` in production.
- Before migrations, record current migration state.
- Use Neon restore point or branch restore.
- If a migration partially applies, stop writes, inspect `_prisma_migrations`, and roll forward with a corrective migration or restore from Neon.
- Current production branch: `main` / `br-royal-meadow-aj5mfnua`.
- Current preview branch: `preview` / `br-blue-block-ajqo0ky7`.
- Never run `prisma migrate reset` or destructive seed scripts against production.

## Stripe rollback

- Do not delete historical Stripe prices.
- Create replacement prices and update env vars.
- To pause monetization, set `BILLING_MOCK_MODE=true`.
- Keep webhook handlers idempotent.

## Emergency flags

```bash
MAINTENANCE_MODE=false
BILLING_MOCK_MODE=true
DEMO_LOGIN_ENABLED=false
EXPORT_ENABLED=false
```

Owner: product/engineering operator for HR Nexus.

## Safety checks after rollback

```bash
curl -I https://hr-nexus-hazel.vercel.app/api/health
curl -I https://hr-nexus-hazel.vercel.app/api/version
PRODUCTION_BASE_URL=https://hr-nexus-hazel.vercel.app npm run smoke:production
```

If smoke cannot complete because of local Node fetch `ECONNRESET` while curl returns 200, verify through browser and Vercel logs before taking further rollback action.
