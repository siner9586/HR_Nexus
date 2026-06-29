# Acceptance

## 功能验收

官网、注册、登录、平台管理、Dashboard、员工、组织、入职、生命周期、合同、考勤、请假、薪资、工资条、社保公积金、审批、招聘、绩效、培训、数据分析、通知、文件、设置、审计、Billing 和 Postman 均已提供基础可运行版本。

## 技术验收

TypeScript strict、Prisma schema、db push、seed、API RBAC、tenantId、字段脱敏、AuditLog、Webhook 签名逻辑、Postman Collection、Docker、Vercel + Neon 文档。

## 已知限制

V1.0 未接入真实电子签、企微/钉钉/飞书、银行发薪；AI 为预留；Stripe 默认 mock mode，需配置真实 key 与 price 后进入 test/live。
