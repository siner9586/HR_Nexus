# Deployment

## 本地

```bash
docker compose up -d postgres
npm run db:push
npm run db:seed
npm run dev
```

## Docker

```bash
docker compose up --build
```

## Vercel + Neon

1. 在 Neon 创建 PostgreSQL，复制 DATABASE_URL。
2. 在 Vercel 导入 GitHub 仓库。
3. 设置环境变量：DATABASE_URL、DIRECT_URL、NEXTAUTH_SECRET、NEXTAUTH_URL、APP_URL、上传、邮件、观测和 AI 变量。
4. Build command: npm run build。
5. 部署后执行迁移或推送，再执行 seed。

Vercel CLI 可用：

```bash
vercel env pull .env.local
vercel deploy
```
