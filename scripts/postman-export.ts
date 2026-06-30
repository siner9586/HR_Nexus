import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

type BodyMode = "raw";
type RequestDef = {
  name: string;
  method: "GET" | "POST" | "PATCH" | "DELETE";
  url: string;
  body?: Record<string, unknown>;
  tests?: string[];
};

const csvEmployeeImport = "name,phone,email,employeeNo,departmentName,positionName,hireDate,employmentType,workLocation\nPostman导入员工,13811112222,postman.import@example.com,PMIMPORT001,人力资源部,HR Specialist,2026-07-01,FULL_TIME,合肥\n";

const folders: Record<string, RequestDef[]> = {
  Health: [
    { name: "Health Check", method: "GET", url: "/api/health", tests: ["success"] },
    { name: "Version", method: "GET", url: "/api/version", tests: ["success"] },
  ],
  Auth: [
    { name: "Login Owner", method: "POST", url: "/api/auth/login", body: { email: "{{ownerEmail}}", password: "{{ownerPassword}}" }, tests: ["saveToken"] },
    { name: "Me", method: "GET", url: "/api/auth/me", tests: ["success"] },
    { name: "Logout", method: "POST", url: "/api/auth/logout", tests: ["success"] },
  ],
  Platform: [
    { name: "Platform Overview", method: "GET", url: "/api/platform/overview", tests: ["success"] },
    { name: "List Tenants", method: "GET", url: "/api/platform/tenants", tests: ["success"] },
    { name: "List Demo Requests", method: "GET", url: "/api/demo-requests", tests: ["success"] },
  ],
  Employees: [
    { name: "List Employees", method: "GET", url: "/api/employees?search=&status=&page=1&pageSize=20", tests: ["success"] },
    { name: "Create Employee", method: "POST", url: "/api/employees", body: { name: "Postman测试员工", email: "postman.employee@example.com", phone: "13812345678", hireDate: "2026-07-01" }, tests: ["saveEmployee"] },
    { name: "Export Employees", method: "GET", url: "/api/employees/export?search=&status=", tests: ["csv"] },
    { name: "Import Employees", method: "POST", url: "/api/employees/import", body: { reason: "Postman CSV import", csv: csvEmployeeImport }, tests: ["success"] },
  ],
  Organization: [
    { name: "List Departments", method: "GET", url: "/api/departments?search=&status=ACTIVE", tests: ["success"] },
    { name: "Create Department", method: "POST", url: "/api/departments", body: { name: "Postman部门", code: "PM-DEPT" }, tests: ["success"] },
    { name: "Export Departments", method: "GET", url: "/api/departments/export?status=ACTIVE", tests: ["csv"] },
    { name: "Create Position", method: "POST", url: "/api/positions", body: { name: "Postman岗位", code: "PM-POS" }, tests: ["success"] },
    { name: "Export Positions", method: "GET", url: "/api/positions/export", tests: ["csv"] },
    { name: "Create Cost Center", method: "POST", url: "/api/cost-centers", body: { name: "Postman成本中心", code: "PM-CC", budget: 100000 }, tests: ["success"] },
    { name: "Export Cost Centers", method: "GET", url: "/api/cost-centers/export", tests: ["csv"] },
  ],
  Contracts: [
    { name: "List Contracts", method: "GET", url: "/api/contracts?status=", tests: ["success"] },
    { name: "Create Contract", method: "POST", url: "/api/contracts", body: { contractNo: "PM-HT-001", contractType: "FIXED_TERM", startDate: "2026-07-01", endDate: "2029-06-30" }, tests: ["success"] },
    { name: "Export Contracts", method: "GET", url: "/api/contracts/export", tests: ["csv"] },
  ],
  Attendance: [
    { name: "Create Clock Record", method: "POST", url: "/api/attendance/clock-records", body: { clockType: "CHECK_IN", source: "WEB", location: "合肥" }, tests: ["success"] },
    { name: "Export Clock Records", method: "GET", url: "/api/attendance/clock-records/export", tests: ["csv"] },
    { name: "Create Shift", method: "POST", url: "/api/attendance/shifts", body: { name: "Postman早班", startTime: "09:00", endTime: "18:00" }, tests: ["success"] },
    { name: "Export Shifts", method: "GET", url: "/api/attendance/shifts/export", tests: ["csv"] },
  ],
  Leave: [
    { name: "Create Leave Request", method: "POST", url: "/api/leave/requests", body: { startAt: "2026-07-01T09:00:00.000Z", endAt: "2026-07-01T18:00:00.000Z", durationHours: 8, reason: "Postman请假" }, tests: ["success"] },
    { name: "Export Leave Requests", method: "GET", url: "/api/leave/requests/export", tests: ["csv"] },
    { name: "Create Overtime", method: "POST", url: "/api/leave/overtime", body: { startAt: "2026-07-01T19:00:00.000Z", endAt: "2026-07-01T21:00:00.000Z", durationHours: 2, compensationType: "PAY", reason: "Postman加班" }, tests: ["success"] },
    { name: "Export Overtime", method: "GET", url: "/api/leave/overtime/export", tests: ["csv"] },
    { name: "Create Punch Correction", method: "POST", url: "/api/leave/punch-corrections", body: { date: "2026-07-01", correctionTime: "2026-07-01T09:00:00.000Z", clockType: "CHECK_IN", reason: "Postman补卡" }, tests: ["success"] },
    { name: "Export Punch Corrections", method: "GET", url: "/api/leave/punch-corrections/export", tests: ["csv"] },
  ],
  Payroll: [
    { name: "Create Salary Item", method: "POST", url: "/api/payroll/items", body: { name: "Postman奖金", code: "PM-BONUS", type: "EARNING" }, tests: ["success"] },
    { name: "Create Salary Batch", method: "POST", url: "/api/payroll/batches", body: { name: "Postman薪资批次", year: 2026, month: 7 }, tests: ["success"] },
    { name: "Export Salary Batches", method: "GET", url: "/api/payroll/batches/export", tests: ["csv"] },
  ],
  "Social Security": [
    { name: "Create Employee Social Security", method: "POST", url: "/api/social-security/employees", body: { city: "合肥", base: 7000, startMonth: "2026-07" }, tests: ["success"] },
    { name: "Export Social Security", method: "GET", url: "/api/social-security/export", tests: ["csv"] },
  ],
  Workflows: [
    { name: "Create Workflow Template", method: "POST", url: "/api/workflows/templates", body: { name: "Postman流程", code: "PM-WF", businessType: "LEAVE" }, tests: ["success"] },
    { name: "Export Workflows", method: "GET", url: "/api/workflows/templates/export", tests: ["csv"] },
  ],
  Approvals: [
    { name: "List Approval Tasks", method: "GET", url: "/api/approvals/tasks?status=PENDING", tests: ["success"] },
    { name: "Export Approvals", method: "GET", url: "/api/approvals/tasks/export", tests: ["csv"] },
  ],
  Recruitment: [
    { name: "Create Candidate", method: "POST", url: "/api/recruitment/candidates", body: { name: "Postman候选人", phone: "13899990000", email: "candidate@example.com", source: "Postman" }, tests: ["success"] },
    { name: "Export Candidates", method: "GET", url: "/api/recruitment/candidates/export", tests: ["csv"] },
  ],
  Performance: [
    { name: "Create Performance Cycle", method: "POST", url: "/api/performance/cycles", body: { name: "Postman绩效周期", type: "QUARTER", startDate: "2026-07-01", endDate: "2026-09-30" }, tests: ["success"] },
    { name: "Export Performance Reviews", method: "GET", url: "/api/performance/reviews/export", tests: ["csv"] },
  ],
  Training: [
    { name: "Create Course", method: "POST", url: "/api/training/courses", body: { title: "Postman课程", courseType: "制度", durationMinutes: 60 }, tests: ["success"] },
    { name: "Export Courses", method: "GET", url: "/api/training/courses/export", tests: ["csv"] },
    { name: "Create Training Task", method: "POST", url: "/api/training/tasks", body: { dueAt: "2026-07-10T18:00:00.000Z" }, tests: ["success"] },
    { name: "Export Training Tasks", method: "GET", url: "/api/training/tasks/export", tests: ["csv"] },
  ],
  Notifications: [
    { name: "Create Notification", method: "POST", url: "/api/notifications", body: { title: "Postman通知", content: "Postman通知内容", type: "SYSTEM" }, tests: ["success"] },
    { name: "Export Notifications", method: "GET", url: "/api/notifications/export", tests: ["csv"] },
  ],
  Files: [
    { name: "Create File Metadata", method: "POST", url: "/api/files", body: { fileName: "postman.pdf", fileUrl: "/demo/files/postman.pdf", fileSize: 1024, mimeType: "application/pdf", ownerType: "employee", visibility: "HR_ONLY" }, tests: ["success"] },
    { name: "Export Files", method: "GET", url: "/api/files/export", tests: ["csv"] },
  ],
  Audit: [{ name: "Export Audit Logs", method: "GET", url: "/api/audit-logs/export", tests: ["csv"] }],
  Analytics: [{ name: "Export Analytics", method: "GET", url: "/api/analytics/export", tests: ["csv"] }],
  "Demo Request": [
    { name: "Create Demo Request", method: "POST", url: "/api/demo-requests", body: { name: "Postman预约", company: "Postman测试公司", email: "demo.request@example.com", phone: "13800000000", employeeCount: "200-500", message: "希望了解 HR Nexus" }, tests: ["success"] },
  ],
};

const testScripts: Record<string, string> = {
  success: `pm.test("status 200/201 and success=true", function () { pm.expect([200, 201]).to.include(pm.response.code); const json = pm.response.json(); pm.expect(json.success).to.eql(true); });`,
  csv: `pm.test("CSV response", function () { pm.expect(pm.response.code).to.eql(200); pm.expect(pm.response.headers.get("Content-Type")).to.include("text/csv"); });`,
  saveToken: `pm.test("save token", function () { pm.expect([200, 201]).to.include(pm.response.code); const json = pm.response.json(); pm.expect(json.success).to.eql(true); pm.environment.set("token", json.data.token); if (json.data.user?.tenantId) pm.environment.set("tenantId", json.data.user.tenantId); });`,
  saveEmployee: `pm.test("save employee id", function () { pm.expect([200, 201]).to.include(pm.response.code); const json = pm.response.json(); pm.expect(json.success).to.eql(true); if (json.data?.id) pm.environment.set("employeeId", json.data.id); });`,
};

function request(def: RequestDef) {
  const bodyMode: BodyMode = "raw";
  return {
    name: def.name,
    event: (def.tests ?? ["success"]).map((name) => ({
      listen: "test",
      script: { type: "text/javascript", exec: [testScripts[name] ?? testScripts.success] },
    })),
    request: {
      method: def.method,
      header: [
        { key: "Content-Type", value: "application/json" },
        { key: "Authorization", value: "Bearer {{token}}" },
      ],
      url: { raw: `{{baseUrl}}${def.url}`, host: ["{{baseUrl}}"], path: def.url.split("/").filter(Boolean) },
      body: def.body ? { mode: bodyMode, raw: JSON.stringify(def.body, null, 2), options: { raw: { language: "json" } } } : undefined,
    },
  };
}

const collection = {
  info: {
    name: "HR Nexus API",
    schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    description: "HR Nexus V1.0 enterprise HR API collection with auth, tenant, RBAC, module actions, CSV exports and import tests.",
  },
  item: Object.entries(folders).map(([name, requests]) => ({ name, item: requests.map(request) })),
};

function environment(name: string, baseUrl: string, includeDemoPasswords: boolean) {
  return {
    name,
    values: [
      ["baseUrl", baseUrl],
      ["ownerEmail", includeDemoPasswords ? "owner@demo.com" : ""],
      ["ownerPassword", includeDemoPasswords ? "Demo123456!" : ""],
      ["token", ""],
      ["tenantId", ""],
      ["employeeId", ""],
    ].map(([key, value]) => ({ key, value, enabled: true, type: key.toLowerCase().includes("password") || key === "token" ? "secret" : "default" })),
  };
}

const outDir = join(process.cwd(), "docs", "postman");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "HR_Nexus.postman_collection.json"), `${JSON.stringify(collection, null, 2)}\n`);
writeFileSync(join(outDir, "HR_Nexus.local.postman_environment.json"), `${JSON.stringify(environment("HR Nexus Local", "http://127.0.0.1:3000", true), null, 2)}\n`);
writeFileSync(join(outDir, "HR_Nexus.staging.postman_environment.json"), `${JSON.stringify(environment("HR Nexus Staging", "https://hr-nexus-staging.vercel.app", true), null, 2)}\n`);
writeFileSync(join(outDir, "HR_Nexus.production.postman_environment.json"), `${JSON.stringify(environment("HR Nexus Production", "https://hr-nexus-hazel.vercel.app", false), null, 2)}\n`);
console.log("Postman collection and environments generated.");
