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

## 核心资源

API 覆盖 tenants、users、roles、permissions、employees、departments、positions、cost-centers、onboarding、lifecycle、contracts、attendance、leave、payroll、payslips、social-security、workflows、approvals、recruitment、performance、training、analytics、notifications、files、exports、audit-logs、billing。

所有写操作经过 Zod 或服务端字段校验、权限校验、tenantId 校验，并写入 AuditLog。
