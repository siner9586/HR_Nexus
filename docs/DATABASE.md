# Database

Prisma schema 包含租户、用户、角色、权限、组织、员工、合同、考勤、假勤、薪资、社保公积金、审批流、招聘、绩效、培训、通知、文件、导出和审计模型。

## 租户隔离

核心业务表均包含 tenantId，并在 API 查询中按当前用户 tenantId 限定。平台管理员默认访问平台级数据。

## 索引与唯一约束

schema 对 tenantId、employeeId、departmentId、companyId、status、createdAt、year/month、contract endDate、attendance date、workflow status 和 salary batch year/month 建立索引或唯一约束。

## Prisma 工作流

```bash
npx prisma validate
npx prisma format
npx prisma generate
npm run db:push
npm run db:seed
```
