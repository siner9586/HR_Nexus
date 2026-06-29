import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const docs = {
  "README.md": `# HR Nexus V1.0

HR Nexus Enterprise Human Resource Management Platform 是一个多租户企业级 HR SaaS 平台，覆盖员工、组织、入职、生命周期、合同、考勤、请假、薪资、社保公积金、审批、招聘、绩效、培训、通知、文件、审计、Stripe 订阅计费和 Postman API 测试。

## 技术栈

- Next.js App Router、React、TypeScript、Tailwind CSS
- Prisma ORM、PostgreSQL、Zod
- JWT Cookie session、bcryptjs、RBAC、字段权限、审计日志
- Stripe Checkout、Billing Portal、Webhook、mock billing mode
- Vitest、Playwright、Postman Collection
- Docker、Vercel + Neon 部署说明

## 快速启动

\`\`\`bash
cd /Users/wangzheng/Documents/vibecoding/HR_Nexus
npm install
cp .env.example .env
docker compose up -d postgres
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
\`\`\`

访问 http://127.0.0.1:3000。

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

\`\`\`bash
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
\`\`\`

## Postman

导入 \`docs/postman/HR_Nexus.postman_collection.json\` 和 \`docs/postman/HR_Nexus.local.postman_environment.json\`，先运行 Auth/Login Owner 保存 token，再运行核心接口。

## Stripe

默认 \`BILLING_MOCK_MODE=true\`，无需真实密钥即可返回 mock checkout URL。配置 Stripe test key、price id 和 webhook secret 后可切换到真实 Stripe test mode。
`,
  "docs/PRODUCT.md": `# Product

HR Nexus 面向中小企业、集团公司、连锁、制造、服务业、劳务外包、驾校、物业、教育培训、项目制和多门店企业。V1.0 目标是建立可演示、可运行、可商业化迭代的人力资源数字化底座。

## 功能地图

- 员工中心：员工档案、组织架构、入职、转正、调岗、调薪、离职
- 合同中心：合同台账、模板、到期预警、续签、终止
- 考勤假勤：规则、班次、排班、打卡、日/月考勤、请假、加班、补卡、假期余额
- 薪酬中心：薪资项目、结构、档案、批次、明细、工资条、社保公积金
- 审批中心：流程模板、实例、任务、评论
- 招聘、绩效、培训基础版
- 数据分析、通知、文件、审计、计费

## 套餐

FREE、STANDARD、PROFESSIONAL、ENTERPRISE、PRIVATE_DEPLOYMENT。套餐控制员工上限、功能开关、存储和 AI credits。
`,
  "docs/ARCHITECTURE.md": `# Architecture

## 系统架构

Next.js 负责页面和 Route Handlers，Prisma 连接 PostgreSQL。所有业务表带 tenantId，平台级表支持 tenantId 为空。API 层统一返回 envelope，并在写操作中写 AuditLog。

## 前端

AppShell 提供 Sidebar、TopNav、租户、用户、通知和全局搜索入口。页面采用 Server Components 拉取数据，表单和计费按钮用 Client Components。

## 后端

\`app/api/[...path]/route.ts\` 做统一分发，覆盖 Auth、Platform、Tenant、Employees、Organization、Contracts、Attendance、Leave、Payroll、Payslips、Workflow、Approvals、Recruitment、Performance、Training、Analytics、Notifications、Files、Audit、Billing。

## 权限层

\`lib/permissions.ts\` 定义 RBAC；\`lib/tenant.ts\` 做 tenant access；\`lib/field-permissions.ts\` 和 \`lib/masking.ts\` 控制敏感字段。

## Billing 层

\`lib/stripe.ts\` 管理 Stripe client 和 mock mode；\`lib/billing.ts\` 管理 checkout、portal、billing overview。
`,
  "docs/DATABASE.md": `# Database

Prisma schema 包含要求的 enum、租户、套餐、订阅、发票、用户、角色、权限、组织、员工、合同、考勤、假勤、薪资、社保公积金、审批流、招聘、绩效、培训、通知、文件、导出和审计模型。

## 租户隔离

核心业务表均包含 tenantId，并在 API 查询中按当前用户 tenantId 限定。平台管理员默认访问平台级数据。

## 索引与唯一约束

schema 对 tenantId、employeeId、departmentId、companyId、status、createdAt、year/month、contract endDate、attendance date、workflow status、salary batch year/month、Stripe id 和 BillingEvent.stripeEventId 建立索引或唯一约束。

## Prisma 工作流

\`\`\`bash
npm run db:generate
npm run db:push
npm run db:seed
\`\`\`

本地已验证：Prisma validate、generate、db push、seed 成功。
`,
  "docs/API.md": `# API

统一成功格式：

\`\`\`json
{ "success": true, "data": {}, "message": "ok", "requestId": "req_x" }
\`\`\`

统一失败格式：

\`\`\`json
{ "success": false, "error": { "code": "FORBIDDEN", "message": "无权限操作" }, "requestId": "req_x" }
\`\`\`

## 认证

- POST /api/auth/login
- POST /api/auth/logout
- GET /api/auth/me
- POST /api/auth/demo-login

## 核心资源

API 覆盖 tenants、users、roles、permissions、employees、departments、positions、cost-centers、onboarding、lifecycle、contracts、attendance、leave、payroll、payslips、social-security、workflows、approvals、recruitment、performance、training、analytics、notifications、files、exports、audit-logs、billing。

所有写操作经过 Zod 或服务端字段校验、权限校验、tenantId 校验，并写入 AuditLog。
`,
  "docs/POSTMAN.md": `# Postman

## 文件

- Collection: docs/postman/HR_Nexus.postman_collection.json
- Environment: docs/postman/HR_Nexus.local.postman_environment.json

## 使用步骤

1. 启动本地服务。
2. 导入 Collection 和 Environment。
3. 选择 HR Nexus Local Environment。
4. 先运行 Auth/Login Owner 或 Auth/Login HR 保存 token。
5. 运行 Employees、Contracts、Attendance、Payroll、Billing 等文件夹。

## 权限测试

先运行 Login Employee，再运行 Payslips/Employee Cannot View Others Payslip，期望 403 和 error.code=FORBIDDEN。

## Billing mock mode

BILLING_MOCK_MODE=true 时 Billing/Create Checkout Session 会返回 mock URL。
`,
  "docs/PERMISSIONS.md": `# Permissions

系统内置 PLATFORM_ADMIN、TENANT_OWNER、TENANT_ADMIN、HR_DIRECTOR、HR_SPECIALIST、PAYROLL_SPECIALIST、FINANCE_MANAGER、DEPARTMENT_MANAGER、EMPLOYEE、AUDITOR。

权限点在 \`lib/constants.ts\` 中定义，覆盖 dashboard、platform、tenant、users、roles、permissions、employees、organization、onboarding、lifecycle、contracts、attendance、leave、payroll、payslips、social_security、workflows、approvals、recruitment、performance、training、analytics、notifications、files、settings、audit_logs、exports、billing、ai。

数据范围：

- 企业 Owner/Admin/HRD：租户内业务数据
- Payroll：薪资社保数据
- Finance：薪资审批和成本
- Manager：部门及下级基础数据
- Employee：本人数据
- Auditor：日志与配置只读
- Platform Admin：平台数据

敏感字段默认脱敏：身份证、手机、银行卡、薪资、合同附件、紧急联系人、地址、绩效评价、离职原因。
`,
  "docs/SECURITY.md": `# Security

- 租户隔离：所有业务查询按 tenantId 限定。
- 密码安全：bcryptjs hash，seed 密码也 hash 后入库。
- 敏感字段：无权限时脱敏，薪资显示“无权限查看”。
- 审计：登录、登出、敏感查看、员工、合同、薪资、审批、导出、下载、Billing 均写 AuditLog。
- 导出：导出需要权限，生成 ExportJob。
- 文件：FileVisibility 预留 HR_ONLY、PAYROLL_ONLY、SENSITIVE 等权限。
- API：统一错误格式，不返回 stack trace。
- Billing：Webhook 校验签名，mock mode 下仅用于本地测试；Price ID 从服务端配置读取。
- AI 边界：V1.0 仅预留 AI，不能自动决定录用、裁员、定薪、绩效淘汰，必须人工复核。
`,
  "docs/BILLING.md": `# Billing

套餐：

- FREE: 20 人，1GB，基础功能
- STANDARD: 399/月，100 人
- PROFESSIONAL: 999/月，500 人，含薪资、招聘、绩效、培训
- ENTERPRISE: 2999/月，3000 人，多公司、BI、API、审计增强
- PRIVATE_DEPLOYMENT: 联系销售

员工数限制由 \`assertPlanEmployeeLimit\` 执行。功能开关在 TenantSetting 中预留：recruitmentEnabled、performanceEnabled、trainingEnabled、payrollEnabled、aiEnabled。

mock mode: \`BILLING_MOCK_MODE=true\` 时无需 Stripe key，checkout 返回本地 success URL。
`,
  "docs/STRIPE.md": `# Stripe

## Dashboard 配置

1. 创建 Product：HR Nexus Standard、Professional、Enterprise。
2. 创建月付/年付 Price。
3. 将 Price ID 写入 .env。
4. 配置 Webhook: /api/billing/webhook。
5. 监听 checkout.session.completed、customer.subscription.created、customer.subscription.updated、customer.subscription.deleted、invoice.paid、invoice.payment_failed。

## 本地测试

\`\`\`bash
stripe listen --forward-to localhost:3000/api/billing/webhook
\`\`\`

将 CLI 输出的 whsec 写入 STRIPE_WEBHOOK_SECRET。

Webhook 在非 mock mode 下使用 stripe.webhooks.constructEvent 校验签名。
`,
  "docs/DEPLOYMENT.md": `# Deployment

## 本地

\`\`\`bash
docker compose up -d postgres
npm run db:push
npm run db:seed
npm run dev
\`\`\`

## Docker

\`\`\`bash
docker compose up --build
\`\`\`

## Vercel + Neon

1. 在 Neon 创建 PostgreSQL，复制 DATABASE_URL。
2. 在 Vercel 导入 GitHub 仓库。
3. 设置环境变量：DATABASE_URL、NEXTAUTH_SECRET、NEXTAUTH_URL、APP_URL、BILLING_MOCK_MODE、Stripe 变量。
4. Build command: npm run build。
5. 部署后执行迁移/推送：\`npx prisma db push\`，再执行 seed。

Vercel CLI 可用：

\`\`\`bash
vercel env pull .env.local
vercel deploy
\`\`\`
`,
  "docs/DEMO-DATA.md": `# Demo Data

seed 生成：

- 租户：安徽智企科技有限公司、合肥制造示范有限公司
- 员工：110
- 合同：95
- 打卡：3170
- 工资条：180
- 审计日志：200
- 套餐：FREE、STANDARD、PROFESSIONAL、ENTERPRISE、PRIVATE_DEPLOYMENT
- 订阅、发票、BillingEvent、组织、岗位、成本中心、假期余额、薪资项目、审批流、招聘、绩效、培训、通知、文件、导出任务

运行：

\`\`\`bash
npm run db:seed
\`\`\`
`,
  "docs/TESTING.md": `# Testing

## Unit

\`\`\`bash
npm run test
\`\`\`

覆盖 permissions、masking、tenant、payroll、workflow、billing。

## Smoke

启动 dev server 后：

\`\`\`bash
npm run smoke
\`\`\`

覆盖登录、me、员工、合同、dashboard、billing checkout。

## E2E

\`\`\`bash
npm run test:e2e
\`\`\`

覆盖登录、Dashboard、员工、权限差异、Billing。

## Postman

导入 docs/postman 文件，先登录保存 token，再运行 Collection。
`,
  "docs/ROADMAP.md": `# Roadmap

## V1.0

员工、组织、合同、考勤、请假、薪资、审批、看板、权限、审计、Stripe mock/基础计费、Postman Collection。

## V1.1

招聘增强、绩效增强、培训增强、导入导出增强、通知集成。

## V1.2

电子签、企业微信/钉钉/飞书、社保公积金增强、薪资公式增强、Stripe 生产计费增强。

## V2.0

AI HR 助手、简历解析、制度问答、智能排班、离职风险预测、人效预测。

## V3.0

私有化部署、集团多组织增强、行业版、API 开放平台。
`,
  "docs/ACCEPTANCE.md": `# Acceptance

## 功能验收

官网、注册、登录、平台管理、Dashboard、员工、组织、入职、生命周期、合同、考勤、请假、薪资、工资条、社保公积金、审批、招聘、绩效、培训、数据分析、通知、文件、设置、审计、Billing 和 Postman 均已提供基础可运行版本。

## 技术验收

TypeScript strict、Prisma schema、db push、seed、API RBAC、tenantId、字段脱敏、AuditLog、Webhook 签名逻辑、Postman Collection、Docker、Vercel + Neon 文档。

## 已知限制

V1.0 未接入真实电子签、企微/钉钉/飞书、银行发薪；AI 为预留；Stripe 默认 mock mode，需配置真实 key 与 price 后进入 test/live。
`,
};

for (const [file, content] of Object.entries(docs)) {
  const fullPath = join(process.cwd(), file);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content);
}

console.log(`Generated ${Object.keys(docs).length} docs.`);
