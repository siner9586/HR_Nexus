# Architecture

## 系统架构

Next.js 负责页面和 Route Handlers，Prisma 连接 PostgreSQL。所有业务表带 tenantId，平台级表支持 tenantId 为空。API 层统一返回 envelope，并在写操作中写 AuditLog。

## 前端

AppShell 提供 Sidebar、TopNav、租户、用户、通知和全局搜索入口。页面采用 Server Components 拉取数据，交互控件采用 Client Components。

## 后端

`app/api/[...path]/route.ts` 做统一分发，覆盖 Auth、Platform、Tenant、Employees、Organization、Contracts、Attendance、Leave、Payroll、Payslips、Workflow、Approvals、Recruitment、Performance、Training、Analytics、Notifications、Files 和 Audit。

## 权限层

`lib/permissions.ts` 定义 RBAC；`lib/tenant.ts` 做 tenant access；`lib/field-permissions.ts` 和 `lib/masking.ts` 控制敏感字段。

## Export Layer

`lib/export.ts` 统一 CSV 文件名、UTF-8 BOM、中文表头、日期/金额格式化、敏感字段脱敏和导出审计。API 导出会写 AuditLog，关键导出会写 ExportJob。

## Enterprise Module Action Layer

`components/shared/module-page.tsx` 提供模块通用新建、筛选、导出、分页提示和行操作。通用 API 根据资源配置执行权限校验、租户过滤、创建、筛选、导出和软归档。
