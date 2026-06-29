# Permissions

系统内置 PLATFORM_ADMIN、TENANT_OWNER、TENANT_ADMIN、HR_DIRECTOR、HR_SPECIALIST、PAYROLL_SPECIALIST、FINANCE_MANAGER、DEPARTMENT_MANAGER、EMPLOYEE、AUDITOR。

权限点在 `lib/constants.ts` 中定义，覆盖 dashboard、platform、tenant、users、roles、permissions、employees、organization、onboarding、lifecycle、contracts、attendance、leave、payroll、payslips、social_security、workflows、approvals、recruitment、performance、training、analytics、notifications、files、settings、audit_logs、exports、billing、ai。

数据范围：

- 企业 Owner/Admin/HRD：租户内业务数据
- Payroll：薪资社保数据
- Finance：薪资审批和成本
- Manager：部门及下级基础数据
- Employee：本人数据
- Auditor：日志与配置只读
- Platform Admin：平台数据

敏感字段默认脱敏：身份证、手机、银行卡、薪资、合同附件、紧急联系人、地址、绩效评价、离职原因。
