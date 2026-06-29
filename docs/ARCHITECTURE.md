# Architecture

## 系统架构

Next.js 负责页面和 Route Handlers，Prisma 连接 PostgreSQL。所有业务表带 tenantId，平台级表支持 tenantId 为空。API 层统一返回 envelope，并在写操作中写 AuditLog。

## 前端

AppShell 提供 Sidebar、TopNav、租户、用户、通知和全局搜索入口。页面采用 Server Components 拉取数据，表单和计费按钮用 Client Components。

## 后端

`app/api/[...path]/route.ts` 做统一分发，覆盖 Auth、Platform、Tenant、Employees、Organization、Contracts、Attendance、Leave、Payroll、Payslips、Workflow、Approvals、Recruitment、Performance、Training、Analytics、Notifications、Files、Audit、Billing。

## 权限层

`lib/permissions.ts` 定义 RBAC；`lib/tenant.ts` 做 tenant access；`lib/field-permissions.ts` 和 `lib/masking.ts` 控制敏感字段。

## Billing 层

`lib/stripe.ts` 管理 Stripe client 和 mock mode；`lib/billing.ts` 管理 checkout、portal、billing overview。
