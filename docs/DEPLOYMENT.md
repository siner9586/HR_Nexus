# Deployment

## 本地

```bash
docker compose up -d postgres
npm run db:migrate
npm run db:seed
npm run dev
```

## Docker

```bash
docker compose up --build
```

## Vercel + Neon

Current production resources already exist. Do not recreate the Neon project or Vercel project for V1.0 production landing.

1. Use existing Vercel project `githubcomsiner9586excavator/hr-nexus`.
2. Production URL: `https://hr-nexus-hazel.vercel.app`.
3. Use existing Neon project `weathered-sunset-91227227`.
4. Production branch: `main` / `br-royal-meadow-aj5mfnua`.
5. Preview branch: `preview` / `br-blue-block-ajqo0ky7`.
6. Set environment variables in Vercel; never commit `.env`, database URLs, Stripe secrets, or webhook secrets.
7. Build command: `npm run build`.
8. Deploy migrations with `npm run db:migrate:deploy`.
9. Do not run production reset, `db push`, or demo seed against production.

Vercel CLI 可用：

```bash
vercel env pull .env.local
vercel deploy --prod --scope githubcomsiner9586excavator
```

After deploy:

```bash
curl -I https://hr-nexus-hazel.vercel.app/api/health
curl -I https://hr-nexus-hazel.vercel.app/api/version
PRODUCTION_BASE_URL=https://hr-nexus-hazel.vercel.app npm run smoke:production
```
