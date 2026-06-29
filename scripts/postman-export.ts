import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

type RequestDef = {
  name: string;
  method: string;
  url: string;
  body?: Record<string, unknown>;
  tests?: string[];
};

const folders: Record<string, RequestDef[]> = {
  Auth: [
    { name: "Login Platform Admin", method: "POST", url: "/api/auth/login", body: { email: "{{platformAdminEmail}}", password: "{{platformAdminPassword}}" }, tests: ["saveToken"] },
    { name: "Login Owner", method: "POST", url: "/api/auth/login", body: { email: "{{ownerEmail}}", password: "{{ownerPassword}}" }, tests: ["saveToken"] },
    { name: "Login HR", method: "POST", url: "/api/auth/login", body: { email: "{{hrEmail}}", password: "{{hrPassword}}" }, tests: ["saveToken"] },
    { name: "Login Payroll", method: "POST", url: "/api/auth/login", body: { email: "{{payrollEmail}}", password: "{{payrollPassword}}" }, tests: ["saveToken"] },
    { name: "Login Employee", method: "POST", url: "/api/auth/login", body: { email: "{{employeeEmail}}", password: "{{employeePassword}}" }, tests: ["saveToken"] },
    { name: "Me", method: "GET", url: "/api/auth/me", tests: ["success"] },
    { name: "Logout", method: "POST", url: "/api/auth/logout", tests: ["success"] },
  ],
  Platform: [
    { name: "Platform Overview", method: "GET", url: "/api/platform/overview" },
    { name: "List Tenants", method: "GET", url: "/api/platform/tenants" },
    { name: "List Plans", method: "GET", url: "/api/platform/plans" },
    { name: "List Subscriptions", method: "GET", url: "/api/platform/subscriptions" },
  ],
  Tenant: [
    { name: "Current Tenant", method: "GET", url: "/api/tenants/current" },
    { name: "Update Tenant Settings", method: "PATCH", url: "/api/tenants/settings", body: { payrollDay: 10 } },
  ],
  Employees: [
    { name: "List Employees", method: "GET", url: "/api/employees", tests: ["success", "arrayData"] },
    { name: "Create Employee", method: "POST", url: "/api/employees", body: { name: "Postman测试员工", email: "postman.employee@example.com", phone: "13812345678" }, tests: ["success", "saveEmployee"] },
    { name: "Get Employee Detail", method: "GET", url: "/api/employees/{{employeeId}}" },
    { name: "Update Employee", method: "PATCH", url: "/api/employees/{{employeeId}}", body: { workLocation: "合肥" } },
    { name: "Export Employees", method: "GET", url: "/api/employees/export" },
    { name: "Get Employee Changes", method: "GET", url: "/api/employees/{{employeeId}}/changes" },
    { name: "Get Employee Audit Logs", method: "GET", url: "/api/employees/{{employeeId}}/audit-logs" },
  ],
  Organization: [
    { name: "List Departments", method: "GET", url: "/api/departments" },
    { name: "Department Tree", method: "GET", url: "/api/departments/tree" },
    { name: "Create Department", method: "POST", url: "/api/departments", body: { companyId: "{{companyId}}", name: "Postman部门", code: "POSTMAN" } },
    { name: "List Positions", method: "GET", url: "/api/positions" },
    { name: "Create Position", method: "POST", url: "/api/positions", body: { departmentId: "{{departmentId}}", name: "Postman岗位", code: "POSTMAN" } },
    { name: "List Cost Centers", method: "GET", url: "/api/cost-centers" },
  ],
  Contracts: [
    { name: "List Contracts", method: "GET", url: "/api/contracts" },
    { name: "Create Contract", method: "POST", url: "/api/contracts", body: { employeeId: "{{employeeId}}", contractNo: "POSTMAN-001", contractType: "FIXED_TERM", startDate: "2026-07-01T00:00:00.000Z" } },
    { name: "Get Contract Detail", method: "GET", url: "/api/contracts/{{contractId}}" },
    { name: "Expiring Contracts", method: "GET", url: "/api/contracts/expiring" },
    { name: "Renew Contract", method: "POST", url: "/api/contracts/{{contractId}}/renew" },
    { name: "Terminate Contract", method: "POST", url: "/api/contracts/{{contractId}}/terminate" },
    { name: "List Templates", method: "GET", url: "/api/contracts/templates" },
  ],
  Attendance: [
    { name: "Clock Records", method: "GET", url: "/api/attendance/clock-records" },
    { name: "Clock In", method: "POST", url: "/api/attendance/clock", body: { clockType: "CHECK_IN" } },
    { name: "Daily Attendance", method: "GET", url: "/api/attendance/daily" },
    { name: "Monthly Attendance", method: "GET", url: "/api/attendance/monthly" },
    { name: "Rules", method: "GET", url: "/api/attendance/rules" },
    { name: "Shifts", method: "GET", url: "/api/attendance/shifts" },
    { name: "Schedules", method: "GET", url: "/api/attendance/schedules" },
  ],
  Leave: [
    { name: "Leave Types", method: "GET", url: "/api/leave/types" },
    { name: "Leave Balances", method: "GET", url: "/api/leave/balances" },
    { name: "Leave Requests", method: "GET", url: "/api/leave/requests" },
    { name: "Create Leave Request", method: "POST", url: "/api/leave/requests", body: { employeeId: "{{employeeId}}", leaveTypeId: "{{leaveTypeId}}", startAt: "2026-07-01T09:00:00.000Z", endAt: "2026-07-01T18:00:00.000Z", durationHours: 8 } },
    { name: "Overtime Requests", method: "GET", url: "/api/leave/overtime" },
    { name: "Punch Corrections", method: "GET", url: "/api/leave/punch-corrections" },
  ],
  Payroll: [
    { name: "Salary Items", method: "GET", url: "/api/payroll/items" },
    { name: "Salary Structures", method: "GET", url: "/api/payroll/structures" },
    { name: "Salary Batches", method: "GET", url: "/api/payroll/batches" },
    { name: "Create Salary Batch", method: "POST", url: "/api/payroll/batches", body: { name: "Postman薪资批次", year: 2026, month: 7 } },
    { name: "Calculate Salary Batch", method: "POST", url: "/api/payroll/batches/{{salaryBatchId}}/calculate" },
    { name: "Submit Salary Batch", method: "POST", url: "/api/payroll/batches/{{salaryBatchId}}/submit" },
    { name: "Approve Salary Batch", method: "POST", url: "/api/payroll/batches/{{salaryBatchId}}/approve" },
    { name: "Publish Salary Batch", method: "POST", url: "/api/payroll/batches/{{salaryBatchId}}/publish" },
    { name: "Salary Records", method: "GET", url: "/api/payroll/batches/{{salaryBatchId}}/records" },
  ],
  Payslips: [
    { name: "List My Payslips", method: "GET", url: "/api/payslips" },
    { name: "Get Payslip", method: "GET", url: "/api/payslips/{{payslipId}}" },
    { name: "Confirm Payslip", method: "POST", url: "/api/payslips/{{payslipId}}/confirm" },
    { name: "Employee Cannot View Others Payslip", method: "GET", url: "/api/payslips/{{otherPayslipId}}", tests: ["forbidden"] },
  ],
  Workflows: [
    { name: "Workflow Templates", method: "GET", url: "/api/workflows/templates" },
    { name: "Workflow Instances", method: "GET", url: "/api/workflows/instances" },
  ],
  Approvals: [
    { name: "My Tasks", method: "GET", url: "/api/approvals/tasks" },
    { name: "Approve Task", method: "POST", url: "/api/approvals/tasks/{{workflowTaskId}}/approve" },
    { name: "Reject Task", method: "POST", url: "/api/approvals/tasks/{{workflowTaskId}}/reject" },
  ],
  Recruitment: [
    { name: "Requests", method: "GET", url: "/api/recruitment/requests" },
    { name: "Jobs", method: "GET", url: "/api/recruitment/jobs" },
    { name: "Candidates", method: "GET", url: "/api/recruitment/candidates" },
    { name: "Convert Candidate To Onboarding", method: "POST", url: "/api/recruitment/candidates/{{candidateId}}/convert-to-onboarding" },
  ],
  Performance: [
    { name: "Cycles", method: "GET", url: "/api/performance/cycles" },
    { name: "Goals", method: "GET", url: "/api/performance/goals" },
    { name: "Reviews", method: "GET", url: "/api/performance/reviews" },
  ],
  Training: [
    { name: "Courses", method: "GET", url: "/api/training/courses" },
    { name: "Tasks", method: "GET", url: "/api/training/tasks" },
    { name: "Complete Task", method: "POST", url: "/api/training/tasks/{{trainingTaskId}}/complete" },
  ],
  Analytics: [
    { name: "Dashboard", method: "GET", url: "/api/analytics/dashboard" },
    { name: "Headcount", method: "GET", url: "/api/analytics/headcount" },
    { name: "Turnover", method: "GET", url: "/api/analytics/turnover" },
    { name: "Payroll Cost", method: "GET", url: "/api/analytics/payroll-cost" },
    { name: "Contracts", method: "GET", url: "/api/analytics/contracts" },
    { name: "Attendance", method: "GET", url: "/api/analytics/attendance" },
  ],
  Notifications: [
    { name: "List Notifications", method: "GET", url: "/api/notifications" },
    { name: "Mark Read", method: "POST", url: "/api/notifications/{{notificationId}}/read" },
    { name: "Mark All Read", method: "POST", url: "/api/notifications/read-all" },
  ],
  Files: [
    { name: "List Files", method: "GET", url: "/api/files" },
    { name: "Upload File", method: "POST", url: "/api/files/upload", body: { fileName: "postman.pdf", fileUrl: "/demo/files/postman.pdf", fileSize: 1024, mimeType: "application/pdf" } },
    { name: "Download File", method: "GET", url: "/api/files/{{fileId}}/download" },
  ],
  Audit: [{ name: "Audit Logs", method: "GET", url: "/api/audit-logs" }],
  Billing: [
    { name: "Current Billing", method: "GET", url: "/api/billing/current" },
    { name: "Create Checkout Session", method: "POST", url: "/api/billing/checkout", body: { planCode: "PROFESSIONAL", interval: "month" }, tests: ["checkout"] },
    { name: "Create Billing Portal Session", method: "POST", url: "/api/billing/portal" },
    { name: "Mock Checkout", method: "POST", url: "/api/billing/mock-upgrade", body: { planCode: "ENTERPRISE" } },
    { name: "Webhook Test Notes", method: "POST", url: "/api/billing/webhook", body: { id: "evt_mock_postman", type: "checkout.session.completed", data: { object: { metadata: { tenantId: "{{tenantId}}", planCode: "PROFESSIONAL" } } } } },
  ],
};

const testScripts: Record<string, string> = {
  success: `pm.test("统一返回 success=true", function () { pm.expect(pm.response.json().success).to.eql(true); });`,
  arrayData: `pm.test("列表返回数组", function () { const json = pm.response.json(); pm.expect(json.data.items || json.data).to.be.an("array"); });`,
  forbidden: `pm.test("无权限返回 403", function () { pm.expect(pm.response.code).to.eql(403); pm.expect(pm.response.json().error.code).to.eql("FORBIDDEN"); });`,
  checkout: `pm.test("Checkout 返回 URL", function () { const json = pm.response.json(); pm.expect(json.success).to.eql(true); pm.expect(json.data.url).to.be.a("string"); });`,
  saveToken: `pm.test("保存 token", function () { const json = pm.response.json(); pm.expect(json.success).to.eql(true); pm.environment.set("token", json.data.token); if (json.data.user?.tenantId) pm.environment.set("tenantId", json.data.user.tenantId); });`,
  saveEmployee: `pm.test("保存 employeeId", function () { const json = pm.response.json(); if (json.data?.id) pm.environment.set("employeeId", json.data.id); });`,
};

function request(def: RequestDef) {
  const events = [
    ...(def.tests ?? ["success"]).map((name) => ({ listen: "test", script: { type: "text/javascript", exec: [testScripts[name] ?? testScripts.success] } })),
  ];
  return {
    name: def.name,
    event: events,
    request: {
      method: def.method,
      header: [
        { key: "Content-Type", value: "application/json" },
        { key: "Authorization", value: "Bearer {{token}}" },
      ],
      url: { raw: `{{baseUrl}}${def.url}`, host: ["{{baseUrl}}"], path: def.url.split("/").filter(Boolean) },
      body: def.body ? { mode: "raw", raw: JSON.stringify(def.body, null, 2), options: { raw: { language: "json" } } } : undefined,
    },
  };
}

const collection = {
  info: {
    name: "HR Nexus API",
    schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    description: "HR Nexus V1.0 enterprise HR SaaS API collection with auth, tenant, RBAC, HR modules, billing and permission tests.",
  },
  item: Object.entries(folders).map(([name, requests]) => ({ name, item: requests.map(request) })),
};

const environment = {
  name: "HR Nexus Local",
  values: [
    ["baseUrl", "http://localhost:3000"],
    ["platformAdminEmail", "admin@platform.local"],
    ["platformAdminPassword", "Admin123456!"],
    ["ownerEmail", "owner@demo.com"],
    ["ownerPassword", "Demo123456!"],
    ["hrEmail", "hr@demo.com"],
    ["hrPassword", "Demo123456!"],
    ["payrollEmail", "payroll@demo.com"],
    ["payrollPassword", "Demo123456!"],
    ["employeeEmail", "employee@demo.com"],
    ["employeePassword", "Demo123456!"],
    ["token", ""],
    ["tenantId", ""],
    ["employeeId", ""],
    ["companyId", ""],
    ["departmentId", ""],
    ["leaveTypeId", ""],
    ["contractId", ""],
    ["salaryBatchId", ""],
    ["workflowTaskId", ""],
    ["payslipId", ""],
    ["otherPayslipId", ""],
    ["candidateId", ""],
    ["trainingTaskId", ""],
    ["notificationId", ""],
    ["fileId", ""],
  ].map(([key, value]) => ({ key, value, enabled: true, type: key.toLowerCase().includes("password") || key === "token" ? "secret" : "default" })),
};

const outDir = join(process.cwd(), "docs", "postman");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "HR_Nexus.postman_collection.json"), `${JSON.stringify(collection, null, 2)}\n`);
writeFileSync(join(outDir, "HR_Nexus.local.postman_environment.json"), `${JSON.stringify(environment, null, 2)}\n`);
console.log("Postman collection and environment generated.");
