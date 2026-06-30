import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const docs: Record<string, string> = {
  "README.md": `# HR Nexus V1.0

HR Nexus Enterprise Human Resource Management Platform 是一个多租户企业级人力资源管理平台，覆盖员工、组织、入职、生命周期、合同、考勤、请假、薪资、社保公积金、审批、招聘、绩效、培训、通知、文件、审计、导入导出和 Postman API 测试。

## 技术栈

- Next.js App Router、React、TypeScript、Tailwind CSS
- Prisma ORM、PostgreSQL、Zod
- JWT Cookie session、bcryptjs、RBAC、字段权限、审计日志
- CSV 导入导出、ExportJob、敏感字段脱敏
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

导入 \`docs/postman/HR_Nexus.postman_collection.json\` 和 \`docs/postman/HR_Nexus.local.postman_environment.json\`，先运行 Auth/Login Owner 保存 token，再运行各模块接口。
`,
  "docs/PRODUCT.md": `# Product

HR Nexus 面向中小企业、集团公司、连锁、制造、服务业、劳务外包、驾校、物业、教育培训、项目制和多门店企业。V1.0 目标是建立可演示、可运行、可私有化交付的人力资源数字化底座。

## 功能地图

- 员工中心：员工档案、组织架构、入职、转正、调岗、调薪、离职
- 合同中心：合同台账、模板、到期预警、续签、终止
- 考勤假勤：规则、班次、排班、打卡、日/月考勤、请假、加班、补卡、假期余额
- 薪酬中心：薪资项目、结构、档案、批次、明细、工资条、社保公积金
- 审批中心：流程模板、实例、任务、评论
- 招聘、绩效、培训基础版
- 数据分析、通知、文件、审计、导入导出

## 交付模式

V1.0 按企业内部部署、私有化部署或项目化交付组织能力，不提供系统内商业方案购买或支付流程。模块开关保留在 TenantSetting 中，作为实施配置和权限控制的一部分。
`,
  "docs/ARCHITECTURE.md": `# Architecture

## 系统架构

Next.js 负责页面和 Route Handlers，Prisma 连接 PostgreSQL。所有业务表带 tenantId，平台级表支持 tenantId 为空。API 层统一返回 envelope，并在写操作中写 AuditLog。

## 前端

AppShell 提供 Sidebar、TopNav、租户、用户、通知和全局搜索入口。页面采用 Server Components 拉取数据，交互控件采用 Client Components。

## 后端

\`app/api/[...path]/route.ts\` 做统一分发，覆盖 Auth、Platform、Tenant、Employees、Organization、Contracts、Attendance、Leave、Payroll、Payslips、Workflow、Approvals、Recruitment、Performance、Training、Analytics、Notifications、Files 和 Audit。

## 权限层

\`lib/permissions.ts\` 定义 RBAC；\`lib/tenant.ts\` 做 tenant access；\`lib/field-permissions.ts\` 和 \`lib/masking.ts\` 控制敏感字段。

## Export Layer

\`lib/export.ts\` 统一 CSV 文件名、UTF-8 BOM、中文表头、日期/金额格式化、敏感字段脱敏和导出审计。API 导出会写 AuditLog，关键导出会写 ExportJob。

## Enterprise Module Action Layer

\`components/shared/module-page.tsx\` 提供模块通用新建、筛选、导出、分页提示和行操作。通用 API 根据资源配置执行权限校验、租户过滤、创建、筛选、导出和软归档。
`,
  "docs/DATABASE.md": `# Database

Prisma schema 包含租户、用户、角色、权限、组织、员工、合同、考勤、假勤、薪资、社保公积金、审批流、招聘、绩效、培训、通知、文件、导出和审计模型。

## 租户隔离

核心业务表均包含 tenantId，并在 API 查询中按当前用户 tenantId 限定。平台管理员默认访问平台级数据。

## 索引与唯一约束

schema 对 tenantId、employeeId、departmentId、companyId、status、createdAt、year/month、contract endDate、attendance date、workflow status 和 salary batch year/month 建立索引或唯一约束。

## Prisma 工作流

\`\`\`bash
npx prisma validate
npx prisma format
npx prisma generate
npm run db:push
npm run db:seed
\`\`\`
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

## 模块资源

API 覆盖 tenants、users、roles、permissions、employees、departments、positions、cost-centers、onboarding、lifecycle、contracts、attendance、leave、payroll、payslips、social-security、workflows、approvals、recruitment、performance、training、analytics、notifications、files、exports 和 audit-logs。

每个业务模块至少提供列表、创建、筛选和 CSV 导出基础能力。员工模块额外提供 \`GET /api/employees/export\`、\`POST /api/employees/import\` 和 \`POST /api/employees/bulk\`。

所有写操作经过服务端字段校验、权限校验、tenantId 校验，并写入 AuditLog。默认删除策略是软归档或状态变更。
`,
  "docs/POSTMAN.md": `# Postman

## 文件

- Collection: docs/postman/HR_Nexus.postman_collection.json
- Environment: docs/postman/HR_Nexus.local.postman_environment.json

## 使用步骤

1. 启动本地服务。
2. 导入 Collection 和 Environment。
3. 选择 HR Nexus Local Environment。
4. 先运行 Auth/Login Owner 保存 token。
5. 运行 Employees、Organization、Contracts、Attendance、Leave、Payroll、Recruitment、Performance、Training、Notifications、Files、Audit、Analytics 等文件夹。

## 覆盖范围

Collection 包含员工导入导出、各模块创建、筛选导出、审批/通知/文件/审计/分析导出。JSON 响应校验 status 200/201 且 success=true；CSV 响应校验 Content-Type 包含 text/csv。
`,
  "docs/PERMISSIONS.md": `# Permissions

系统内置 PLATFORM_ADMIN、TENANT_OWNER、TENANT_ADMIN、HR_DIRECTOR、HR_SPECIALIST、PAYROLL_SPECIALIST、FINANCE_MANAGER、DEPARTMENT_MANAGER、EMPLOYEE、AUDITOR。

权限点在 \`lib/constants.ts\` 中定义，覆盖 dashboard、platform、tenant、users、roles、permissions、employees、organization、departments、positions、cost_centers、onboarding、lifecycle、contracts、attendance、leave、payroll、payslips、social_security、workflows、approvals、recruitment、performance、training、analytics、notifications、files、settings、audit_logs、exports 和 ai。

数据范围：

- 企业 Owner/Admin/HRD：租户内业务数据
- Payroll：薪资社保数据
- Finance：薪资审批和成本
- Manager：部门及下级基础数据
- Employee：本人数据
- Auditor：日志与配置只读
- Platform Admin：平台数据

敏感字段默认脱敏：身份证、手机、银行卡、薪资、合同附件、紧急联系人、地址、绩效评价、离职原因。当前 API 仍以 manage/export 等粗粒度权限为主，新增 departments/positions/cost_centers 权限点用于后续细化。
`,
  "docs/SECURITY.md": `# Security

- 租户隔离：所有业务查询按 tenantId 限定。
- 密码安全：bcryptjs hash，seed 密码也 hash 后入库。
- 敏感字段：无权限时脱敏，薪资显示“无权限查看”。
- 审计：登录、登出、敏感查看、员工、合同、薪资、审批、导出、导入、下载和软归档均写 AuditLog。
- 导出：导出需要权限，生成 CSV 并记录导出条件。
- 文件：FileVisibility 预留 HR_ONLY、PAYROLL_ONLY、SENSITIVE 等权限。
- API：统一错误格式，不返回 stack trace。
- AI 边界：V1.0 仅预留 AI，不能自动决定录用、裁员、定薪、绩效淘汰，必须人工复核。
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
3. 设置环境变量：DATABASE_URL、DIRECT_URL、NEXTAUTH_SECRET、NEXTAUTH_URL、APP_URL、上传、邮件、观测和 AI 变量。
4. Build command: npm run build。
5. 部署后执行迁移或推送，再执行 seed。

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
- 组织、岗位、成本中心、假期余额、薪资项目、审批流、招聘、绩效、培训、通知、文件、导出任务

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

覆盖 permissions、masking、tenant、payroll、workflow、export。

## Smoke

启动 dev server 后：

\`\`\`bash
npm run smoke
\`\`\`

覆盖登录、me、员工、合同、dashboard 和核心模块 API。

## E2E

\`\`\`bash
npm run test:e2e
\`\`\`

覆盖登录、Dashboard、员工、权限差异和主要页面入口。

## Postman

导入 docs/postman 文件，先登录保存 token，再运行 Collection。
`,
  "docs/ROADMAP.md": `# Roadmap

## V1.0

员工、组织、合同、考勤、请假、薪资、审批、看板、权限、审计、导入导出、Postman Collection。

## V1.0.1

修复线上反馈、优化导入错误提示、增强列设置、增强批量操作。

## V1.1

招聘增强、绩效增强、培训增强、Excel 导入导出、通知集成、批量审批、批量排班、薪资公式引擎。

## V2.0

AI HR 助手、简历解析、制度问答、智能排班、离职风险预测、人效预测。

## V3.0

私有化部署、集团多组织增强、行业版、API 开放平台。
`,
  "docs/ACCEPTANCE.md": `# Acceptance

## 功能验收

官网、注册、登录、平台管理、Dashboard、员工、组织、入职、生命周期、合同、考勤、请假、薪资、工资条、社保公积金、审批、招聘、绩效、培训、数据分析、通知、文件、设置、审计、Postman 均已提供基础可运行版本。

## 技术验收

TypeScript strict、Prisma schema、db push、seed、API RBAC、tenantId、字段脱敏、AuditLog、Postman Collection、Docker、Vercel + Neon 文档。

## 模块动作验收

员工支持新建、筛选、导出、CSV 导入、列设置和批量操作。通用模块支持新建、筛选、导出、状态标签、行操作和软归档。无详情页的模块不展示详情入口。

## 已知限制

V1.0 未接入真实电子签、企微/钉钉/飞书、银行发薪；AI 为预留；部分模块为基础版，复杂审批联动和批量业务规则将在后续版本增强。
`,
  "docs/PRODUCTION.md": `# Production

## Current Mode

HR Nexus 当前按企业内部部署和项目化交付运行。生产环境需配置数据库、会话密钥、应用地址、上传、邮件、观测和必要的第三方集成。

## Release Checks

- npm run typecheck
- npm run lint
- npm run test
- npm run build
- npx prisma validate
- npx prisma generate
- npm run smoke

## Operational Notes

- 导出会写 AuditLog，关键导出写 ExportJob。
- 员工导入支持 CSV 基础字段，失败行会返回 errors。
- 默认删除策略为软归档或状态变更。
- 薪资、证件、手机、银行卡等敏感字段按权限脱敏。
`,
  "docs/GO-LIVE-CHECKLIST.md": `# Go Live Checklist

- [ ] DATABASE_URL and DIRECT_URL configured.
- [ ] NEXTAUTH_SECRET configured with a strong value.
- [ ] APP_URL and NEXTAUTH_URL set to production domain.
- [ ] Upload provider configured.
- [ ] Email provider configured if notifications are sent by email.
- [ ] npx prisma validate passes.
- [ ] npx prisma generate passes.
- [ ] npm run typecheck passes.
- [ ] npm run lint passes.
- [ ] npm run test passes.
- [ ] npm run build passes.
- [ ] npm run smoke passes.
- [ ] Postman Collection imported and core requests pass.
- [ ] Export audit verified.
- [ ] Employee CSV import verified.
- [ ] Soft archive behavior verified.
`,
  "docs/OPERATIONS.md": `# Operations

## Routine Checks

- Review AuditLog for sensitive access and exports.
- Review ExportJob for large or failed exports.
- Verify seed/demo users are disabled in production unless explicitly needed.
- Rotate secrets through deployment platform environment management.

## Data Handling

- Do not hard-delete enterprise HR data by default.
- Use archive/status transitions for operational cleanup.
- Exported CSV files should be treated as sensitive documents.
- Employee import errors should be reviewed before retrying.
`,
  "docs/ENVIRONMENT.md": `# Environment

| Variable | Required | Notes |
| --- | --- | --- |
| DATABASE_URL | yes | PostgreSQL connection URL. |
| DIRECT_URL | yes | Direct PostgreSQL connection for Prisma. |
| NEXTAUTH_SECRET | yes | Long random secret. |
| NEXTAUTH_URL | yes | Application URL. |
| APP_URL | yes | Application URL used by server actions and links. |
| DEMO_LOGIN_ENABLED | optional | Enables demo login in non-production environments. |
| UPLOAD_PROVIDER | optional | local, S3, or R2. |
| EMAIL_SERVER | optional | SMTP connection string. |
| SENTRY_DSN | optional | Error monitoring. |
| AI_PROVIDER | optional | Reserved AI provider switch. |
| OPENAI_API_KEY | optional | Reserved AI key. |
| EXPORT_ENABLED | optional | Enables CSV export endpoints. |

Do not commit .env or .env.local.
`,
  "docs/ROLLBACK.md": `# Rollback

## Git

\`\`\`bash
git switch main
git revert <commit>
git push origin main
\`\`\`

## Database

Prefer forward fixes. If a database rollback is required, restore from database backup or point-in-time recovery and record the incident in AuditLog or operations notes.

## Application

Redeploy the last known good commit from the deployment platform. Validate login, employee list, exports and smoke tests after rollback.
`,
  "docs/RELEASE-NOTES.md": `# Release Notes

## V1.0

- Enterprise HR platform foundation.
- Employee, organization, contract, attendance, leave, payroll, social security, approvals, recruitment, performance, training, notification, file, audit and analytics modules.
- CSV export layer with UTF-8 BOM, Chinese headers, masking and audit.
- Employee CSV import with row-level errors.
- Enterprise module create/filter/export actions.
- Row actions use soft archive/status transitions.
`,
  "docs/MODULE-ACTIONS.md": `# Module Actions

Common module pages provide:

- Create dialog backed by API POST.
- Search and filter query parameters.
- CSV export links preserving current filters.
- Pagination-ready API responses.
- Status labels in tables.
- Row actions with confirmation and soft archive behavior.
- Detail links only when a real detail page exists.

Current base modules include organization, onboarding, lifecycle, contracts, attendance, leave, payroll, social security, workflows, approvals, recruitment, performance, training, notifications, files, settings, audit logs and analytics.

Employee import CSV fields: name, phone, email, employeeNo, departmentName, positionName, hireDate, employmentType, workLocation, costCenterName. name is required.
`,
  "docs/EXPORTS.md": `# Exports

\`lib/export.ts\` standardizes CSV exports:

- UTF-8 BOM for Excel-compatible Chinese text.
- Chinese field headers.
- Date and money formatting.
- Sensitive field masking based on permissions.
- Filtered exports using current query parameters.
- Selected employee export using ids query parameter.
- AuditLog records for export events.
- ExportJob records for key modules.
- Filename format: hr-nexus-{module}-yyyyMMdd-HHmmss.csv.

Employee import supports CSV through \`POST /api/employees/import\` and returns imported, failed and errors.
`,
};

for (const [file, content] of Object.entries(docs)) {
  const fullPath = join(process.cwd(), file);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content);
}

console.log(`Generated ${Object.keys(docs).length} docs.`);
