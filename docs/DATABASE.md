# Database

Prisma schema 包含要求的 enum、租户、套餐、订阅、发票、用户、角色、权限、组织、员工、合同、考勤、假勤、薪资、社保公积金、审批流、招聘、绩效、培训、通知、文件、导出和审计模型。

## 租户隔离

核心业务表均包含 tenantId，并在 API 查询中按当前用户 tenantId 限定。平台管理员默认访问平台级数据。

## 索引与唯一约束

schema 对 tenantId、employeeId、departmentId、companyId、status、createdAt、year/month、contract endDate、attendance date、workflow status、salary batch year/month、Stripe id 和 BillingEvent.stripeEventId 建立索引或唯一约束。

## Prisma 工作流

```bash
npm run db:generate
npm run db:push
npm run db:seed
```

本地已验证：Prisma validate、generate、db push、seed 成功。
