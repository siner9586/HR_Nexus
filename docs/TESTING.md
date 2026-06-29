# Testing

## Unit

```bash
npm run test
```

覆盖 permissions、masking、tenant、payroll、workflow、billing。

## Smoke

启动 dev server 后：

```bash
npm run smoke
```

覆盖登录、me、员工、合同、dashboard、billing checkout。

默认目标为 `http://127.0.0.1:3000`，可用 `BASE_URL` 覆盖。如果服务未启动，脚本会提示先运行 `npm run start` 或 `npm run dev`。

Production smoke:

```bash
PRODUCTION_BASE_URL=https://hr-nexus-hazel.vercel.app npm run smoke:production
```

Production smoke 默认只检查 `/api/health`、`/api/version`、首页和登录页。只有显式提供 `SMOKE_EMAIL`/`SMOKE_PASSWORD` 或 `ADMIN_EMAIL`/`ADMIN_PASSWORD` 时才执行登录验证。

## E2E

```bash
npm run test:e2e
```

覆盖登录、Dashboard、员工、权限差异、Billing。

## Postman

导入 docs/postman 文件，先登录保存 token，再运行 Collection。
