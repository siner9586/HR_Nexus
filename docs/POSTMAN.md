# Postman

## 文件

- Collection: docs/postman/HR_Nexus.postman_collection.json
- Environment: docs/postman/HR_Nexus.local.postman_environment.json

## 使用步骤

1. 启动本地服务。
2. 导入 Collection 和 Environment。
3. 选择 HR Nexus Local Environment。
4. 先运行 Auth/Login Owner 保存 token。
5. 运行 Employees、Organization、Contracts、Attendance、Leave、Payroll、Recruitment、Performance、Training、Notifications、Files、Audit、Analytics 等文件夹。

## 覆盖范围

Collection 包含员工导入导出、各模块创建、筛选导出、审批/通知/文件/审计/分析导出。JSON 响应校验 status 200/201 且 success=true；CSV 响应校验 Content-Type 包含 text/csv。
