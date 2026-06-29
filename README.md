# HR Nexus V1.0

HR Nexus Enterprise Human Resource Management Platform 是一个多租户企业级 HR SaaS 平台，覆盖员工、组织、入职、生命周期、合同、考勤、请假、薪资、社保公积金、审批、招聘、绩效、培训、通知、文件、审计、Stripe 订阅计费和 Postman API 测试。

## 技术栈

- Next.js App Router、React、TypeScript、Tailwind CSS
- Prisma ORM、PostgreSQL、Zod
- JWT Cookie session、bcryptjs、RBAC、字段权限、审计日志
- Stripe Checkout、Billing Portal、Webhook、mock billing mode
- Vitest、Playwright、Postman Collection
- Docker、Vercel + Neon 部署说明

## 快速启动

```bash
cd /Users/wangzheng/Documents/vibecoding/HR_Nexus
npm install
cp .env.example .env
docker compose up -d postgres
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

访问 http://localhost:3000。

## 演示账号

- admin@platform.local / Admin123456! / PLATFORM_ADMIN
- owner@demo.com / Demo123456! / TENANT_OWNER
- tenant.admin@demo.com / Demo123456! / TENANT_ADMIN
- hrd@demo.com / Demo123456! / HR_DIRECTOR
- hr@demo.com / Demo123456! / HR_SPECIALIST
- payroll@demo.com / Demo123456! / PAYROLL_SPECIALIST
- finance@demo.com / Demo123456! / FINANCE_MANAGER
- manager@demo.com / Demo123456! / DEPARTMENT_MANAGER
- employee@demo.com / Demo123456! / EMPLOYEE
- auditor@demo.com / Demo123456! / AUDITOR

## 常用命令

```bash
npm run dev
npm run build
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run db:generate
npm run db:push
npm run db:seed
npm run smoke
npm run postman:export
```

## Postman

导入 `docs/postman/HR_Nexus.postman_collection.json` 和 `docs/postman/HR_Nexus.local.postman_environment.json`，先运行 Auth/Login Owner 保存 token，再运行核心接口。

## Stripe

默认 `BILLING_MOCK_MODE=true`，无需真实密钥即可返回 mock checkout URL。配置 Stripe test key、price id 和 webhook secret 后可切换到真实 Stripe test mode。
