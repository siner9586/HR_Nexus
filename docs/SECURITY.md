# Security

- 租户隔离：所有业务查询按 tenantId 限定。
- 密码安全：bcryptjs hash，seed 密码也 hash 后入库。
- 敏感字段：无权限时脱敏，薪资显示“无权限查看”。
- 审计：登录、登出、敏感查看、员工、合同、薪资、审批、导出、下载、Billing 均写 AuditLog。
- 导出：导出需要权限，生成 ExportJob。
- 文件：FileVisibility 预留 HR_ONLY、PAYROLL_ONLY、SENSITIVE 等权限。
- API：统一错误格式，不返回 stack trace。
- Billing：Webhook 校验签名，mock mode 下仅用于本地测试；Price ID 从服务端配置读取。
- AI 边界：V1.0 仅预留 AI，不能自动决定录用、裁员、定薪、绩效淘汰，必须人工复核。
