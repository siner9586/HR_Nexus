# Postman

## 文件

- Collection: docs/postman/HR_Nexus.postman_collection.json
- Environment: docs/postman/HR_Nexus.local.postman_environment.json

## 使用步骤

1. 启动本地服务。
2. 导入 Collection 和 Environment。
3. 选择 HR Nexus Local Environment。
4. 先运行 Auth/Login Owner 或 Auth/Login HR 保存 token。
5. 运行 Employees、Contracts、Attendance、Payroll、Billing 等文件夹。

## 权限测试

先运行 Login Employee，再运行 Payslips/Employee Cannot View Others Payslip，期望 403 和 error.code=FORBIDDEN。

## Billing mock mode

BILLING_MOCK_MODE=true 时 Billing/Create Checkout Session 会返回 mock URL。
