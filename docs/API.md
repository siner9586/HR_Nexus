# API

统一成功格式：

```json
{ "success": true, "data": {}, "message": "ok", "requestId": "req_x" }
```

统一失败格式：

```json
{ "success": false, "error": { "code": "FORBIDDEN", "message": "无权限操作" }, "requestId": "req_x" }
```

## 认证

- POST /api/auth/login
- POST /api/auth/logout
- GET /api/auth/me
- POST /api/auth/demo-login

## 模块资源

API 覆盖 tenants、users、roles、permissions、employees、departments、positions、cost-centers、onboarding、lifecycle、contracts、attendance、leave、payroll、payslips、social-security、workflows、approvals、recruitment、performance、training、analytics、notifications、files、exports 和 audit-logs。

每个业务模块至少提供列表、创建、筛选和 CSV 导出基础能力。员工模块额外提供 `GET /api/employees/export`、`POST /api/employees/import` 和 `POST /api/employees/bulk`。

所有写操作经过服务端字段校验、权限校验、tenantId 校验，并写入 AuditLog。默认删除策略是软归档或状态变更。
