# Billing

套餐：

- FREE: 20 人，1GB，基础功能
- STANDARD: 399/月，100 人
- PROFESSIONAL: 999/月，500 人，含薪资、招聘、绩效、培训
- ENTERPRISE: 2999/月，3000 人，多公司、BI、API、审计增强
- PRIVATE_DEPLOYMENT: 联系销售

员工数限制由 `assertPlanEmployeeLimit` 执行。功能开关在 TenantSetting 中预留：recruitmentEnabled、performanceEnabled、trainingEnabled、payrollEnabled、aiEnabled。

mock mode: `BILLING_MOCK_MODE=true` 时无需 Stripe key，checkout 返回本地 success URL。
