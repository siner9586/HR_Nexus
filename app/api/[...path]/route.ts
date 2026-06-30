import type { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { ok, fail, paginationFromUrl } from "@/lib/api-response";
import { writeAuditLog } from "@/lib/audit";
import { clearSessionCookie, requireCurrentUser, setSessionCookie, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { applyExportLimit, assertExportAllowed, auditExport, buildExportFilename, createCsvResponse, recordsToCsv, type ExportColumn } from "@/lib/export";
import { maskEmployeeFields, maskSensitiveValue } from "@/lib/masking";
import { assertPermission, hasPermission, type AuthUser } from "@/lib/permissions";
import { isDemoLoginEnabled } from "@/lib/runtime-env";
import { requirePlatformAccess, requireTenantAccess } from "@/lib/tenant";
import { demoRequestSchema, employeeCreateSchema, loginSchema, registerSchema } from "@/lib/validators";

type Params = { params: Promise<{ path?: string[] }> };

type ModelDelegate = {
  findMany(args?: unknown): Promise<unknown[]>;
  count(args?: unknown): Promise<number>;
  findFirst(args?: unknown): Promise<unknown | null>;
  findUnique(args?: unknown): Promise<unknown | null>;
  create(args: unknown): Promise<unknown>;
  update(args: unknown): Promise<unknown>;
  delete(args: unknown): Promise<unknown>;
};

const delegates = prisma as unknown as Record<string, ModelDelegate>;

type ResourceConfig = {
  model: string;
  module: string;
  viewPermission: Parameters<typeof assertPermission>[1];
  createPermission?: Parameters<typeof assertPermission>[1];
  updatePermission?: Parameters<typeof assertPermission>[1];
  deletePermission?: Parameters<typeof assertPermission>[1];
  exportPermission?: Parameters<typeof assertPermission>[1];
  orderBy?: Record<string, "asc" | "desc">;
  searchFields?: string[];
  filterFields?: string[];
  statusField?: string;
  dateField?: string;
  exportName?: string;
  exportColumns?: ExportColumn[];
  tenantScoped?: boolean;
};

const resources: Record<string, ResourceConfig> = {
  employees: {
    model: "employee",
    module: "employees",
    viewPermission: "employees.view",
    createPermission: "employees.create",
    updatePermission: "employees.update",
    deletePermission: "employees.delete",
    tenantScoped: true,
    orderBy: { createdAt: "desc" },
    searchFields: ["name", "employeeNo", "phone", "email", "idNumberMasked"],
    filterFields: ["companyId", "departmentId", "positionId", "managerId", "costCenterId", "employmentStatus", "employmentType", "workLocation", "gender"],
    statusField: "employmentStatus",
    dateField: "hireDate",
  },
  users: { model: "user", module: "users", viewPermission: "users.view", createPermission: "users.manage", updatePermission: "users.manage", tenantScoped: true, orderBy: { createdAt: "desc" }, searchFields: ["name", "email", "phone"] },
  roles: { model: "role", module: "roles", viewPermission: "roles.view", createPermission: "roles.manage", updatePermission: "roles.manage", tenantScoped: true, orderBy: { createdAt: "desc" }, searchFields: ["name", "code"] },
  companies: { model: "company", module: "organization", viewPermission: "organization.view", createPermission: "organization.manage", updatePermission: "organization.manage", tenantScoped: true, orderBy: { createdAt: "desc" }, searchFields: ["name", "legalName"] },
  departments: { model: "department", module: "organization", viewPermission: "organization.view", createPermission: "organization.manage", updatePermission: "organization.manage", deletePermission: "organization.manage", tenantScoped: true, orderBy: { code: "asc" }, searchFields: ["name", "code"], filterFields: ["companyId", "parentId", "managerEmployeeId", "costCenterId", "status"] },
  positions: { model: "position", module: "organization", viewPermission: "organization.view", createPermission: "organization.manage", updatePermission: "organization.manage", deletePermission: "organization.manage", tenantScoped: true, orderBy: { code: "asc" }, searchFields: ["name", "code"], filterFields: ["departmentId", "level", "sequence", "status"] },
  "cost-centers": { model: "costCenter", module: "organization", viewPermission: "organization.view", createPermission: "organization.manage", updatePermission: "organization.manage", deletePermission: "organization.manage", tenantScoped: true, orderBy: { createdAt: "desc" }, searchFields: ["name", "code"], filterFields: ["ownerEmployeeId", "status"] },
  onboarding: { model: "onboardingTask", module: "onboarding", viewPermission: "onboarding.view", createPermission: "onboarding.manage", updatePermission: "onboarding.manage", tenantScoped: true, orderBy: { createdAt: "desc" }, searchFields: ["title", "status"], filterFields: ["employeeId", "assigneeUserId", "status"], dateField: "dueDate" },
  "lifecycle-changes": { model: "employeeChange", module: "lifecycle", viewPermission: "lifecycle.view", createPermission: "lifecycle.manage", updatePermission: "lifecycle.manage", tenantScoped: true, orderBy: { createdAt: "desc" }, searchFields: ["reason"], filterFields: ["employeeId", "changeType"], dateField: "effectiveDate" },
  contracts: { model: "employeeContract", module: "contracts", viewPermission: "contracts.view", createPermission: "contracts.create", updatePermission: "contracts.update", deletePermission: "contracts.terminate", tenantScoped: true, orderBy: { createdAt: "desc" }, searchFields: ["contractNo"], filterFields: ["employeeId", "templateId", "contractType", "status"], dateField: "endDate" },
  "contract-templates": { model: "contractTemplate", module: "contracts", viewPermission: "contracts.view", createPermission: "contracts.create", updatePermission: "contracts.update", deletePermission: "contracts.update", tenantScoped: true, orderBy: { createdAt: "desc" }, searchFields: ["name"], filterFields: ["contractType", "status"] },
  "attendance-rules": { model: "attendanceRule", module: "attendance", viewPermission: "attendance.view", createPermission: "attendance.manage", tenantScoped: true, orderBy: { createdAt: "desc" }, searchFields: ["name"] },
  shifts: { model: "shift", module: "attendance", viewPermission: "attendance.view", createPermission: "attendance.manage", updatePermission: "attendance.manage", deletePermission: "attendance.manage", tenantScoped: true, orderBy: { createdAt: "desc" }, searchFields: ["name"], filterFields: ["status"] },
  schedules: { model: "schedule", module: "attendance", viewPermission: "attendance.view", createPermission: "attendance.manage", updatePermission: "attendance.manage", deletePermission: "attendance.manage", tenantScoped: true, orderBy: { date: "desc" }, filterFields: ["employeeId", "shiftId", "status"], dateField: "date" },
  "clock-records": { model: "clockRecord", module: "attendance", viewPermission: "attendance.view", createPermission: "attendance.manage", tenantScoped: true, orderBy: { clockTime: "desc" }, filterFields: ["employeeId", "clockType", "source", "status"], dateField: "clockTime" },
  "attendance-daily": { model: "attendanceDaily", module: "attendance", viewPermission: "attendance.view", tenantScoped: true, orderBy: { date: "desc" }, filterFields: ["employeeId", "status"], dateField: "date" },
  "attendance-monthly": { model: "attendanceMonthly", module: "attendance", viewPermission: "attendance.view", tenantScoped: true, orderBy: { year: "desc" }, filterFields: ["employeeId", "year", "month"] },
  "leave-types": { model: "leaveType", module: "leave", viewPermission: "leave.view", createPermission: "leave.manage", tenantScoped: true, orderBy: { createdAt: "desc" }, searchFields: ["name", "code"] },
  "leave-balances": { model: "leaveBalance", module: "leave", viewPermission: "leave.view", tenantScoped: true, orderBy: { createdAt: "desc" } },
  "leave-requests": { model: "leaveRequest", module: "leave", viewPermission: "leave.view", createPermission: "leave.apply", updatePermission: "leave.manage", deletePermission: "leave.manage", tenantScoped: true, orderBy: { createdAt: "desc" }, filterFields: ["employeeId", "leaveTypeId", "status"], dateField: "startAt" },
  overtime: { model: "overtimeRequest", module: "leave", viewPermission: "leave.view", createPermission: "leave.apply", updatePermission: "leave.manage", deletePermission: "leave.manage", tenantScoped: true, orderBy: { createdAt: "desc" }, filterFields: ["employeeId", "compensationType", "status"], dateField: "startAt" },
  "punch-corrections": { model: "punchCorrection", module: "leave", viewPermission: "leave.view", createPermission: "leave.apply", updatePermission: "leave.manage", deletePermission: "leave.manage", tenantScoped: true, orderBy: { createdAt: "desc" }, filterFields: ["employeeId", "clockType", "status"], dateField: "date" },
  "salary-items": { model: "salaryItem", module: "payroll", viewPermission: "payroll.view", createPermission: "payroll.manage", updatePermission: "payroll.manage", deletePermission: "payroll.manage", tenantScoped: true, orderBy: { createdAt: "desc" }, searchFields: ["name", "code"], filterFields: ["type", "status"] },
  "salary-structures": { model: "salaryStructure", module: "payroll", viewPermission: "payroll.view", createPermission: "payroll.manage", updatePermission: "payroll.manage", deletePermission: "payroll.manage", tenantScoped: true, orderBy: { createdAt: "desc" }, searchFields: ["name"], filterFields: ["status"] },
  "salary-profiles": { model: "employeeSalaryProfile", module: "payroll", viewPermission: "payroll.view", createPermission: "payroll.manage", updatePermission: "payroll.manage", tenantScoped: true, orderBy: { createdAt: "desc" }, filterFields: ["employeeId", "salaryStructureId", "status"], dateField: "effectiveDate" },
  "salary-batches": { model: "salaryBatch", module: "payroll", viewPermission: "payroll.view", createPermission: "payroll.manage", updatePermission: "payroll.manage", deletePermission: "payroll.manage", tenantScoped: true, orderBy: { createdAt: "desc" }, searchFields: ["name"], filterFields: ["year", "month", "status"] },
  "salary-records": { model: "salaryRecord", module: "payroll", viewPermission: "payroll.view", tenantScoped: true, orderBy: { createdAt: "desc" }, filterFields: ["employeeId", "batchId", "status"] },
  "social-security-rules": { model: "socialSecurityRule", module: "social_security", viewPermission: "social_security.view", createPermission: "social_security.manage", updatePermission: "social_security.manage", tenantScoped: true, orderBy: { createdAt: "desc" }, searchFields: ["city"], filterFields: ["city", "effectiveYear"] },
  "social-security-employees": { model: "employeeSocialSecurity", module: "social_security", viewPermission: "social_security.view", createPermission: "social_security.manage", updatePermission: "social_security.manage", tenantScoped: true, orderBy: { createdAt: "desc" }, searchFields: ["city"], filterFields: ["employeeId", "city", "status"] },
  workflows: { model: "workflowTemplate", module: "workflows", viewPermission: "workflows.view", createPermission: "workflows.manage", updatePermission: "workflows.manage", deletePermission: "workflows.manage", tenantScoped: true, orderBy: { createdAt: "desc" }, searchFields: ["name", "code", "businessType"], filterFields: ["businessType", "status"] },
  "workflow-instances": { model: "workflowInstance", module: "workflows", viewPermission: "workflows.view", createPermission: "workflows.manage", tenantScoped: true, orderBy: { createdAt: "desc" }, searchFields: ["title"], filterFields: ["businessType", "initiatorId", "status"] },
  approvals: { model: "workflowTask", module: "approvals", viewPermission: "approvals.view", tenantScoped: true, orderBy: { createdAt: "desc" }, filterFields: ["approverId", "status"] },
  "recruitment-requests": { model: "recruitmentRequest", module: "recruitment", viewPermission: "recruitment.view", createPermission: "recruitment.manage", updatePermission: "recruitment.manage", tenantScoped: true, orderBy: { createdAt: "desc" }, filterFields: ["departmentId", "positionId", "priority", "status"], dateField: "expectedStartDate" },
  jobs: { model: "jobPosting", module: "recruitment", viewPermission: "recruitment.view", createPermission: "recruitment.manage", updatePermission: "recruitment.manage", tenantScoped: true, orderBy: { createdAt: "desc" }, searchFields: ["title", "location"], filterFields: ["recruitmentRequestId", "status"], dateField: "publishedAt" },
  candidates: { model: "candidate", module: "recruitment", viewPermission: "recruitment.view", createPermission: "recruitment.manage", updatePermission: "recruitment.manage", deletePermission: "recruitment.manage", tenantScoped: true, orderBy: { createdAt: "desc" }, searchFields: ["name", "phone", "email", "source"], filterFields: ["targetPositionId", "source", "status"] },
  "performance-cycles": { model: "performanceCycle", module: "performance", viewPermission: "performance.view", createPermission: "performance.manage", updatePermission: "performance.manage", tenantScoped: true, orderBy: { createdAt: "desc" }, searchFields: ["name"], filterFields: ["type", "status"], dateField: "startDate" },
  "performance-goals": { model: "performanceGoal", module: "performance", viewPermission: "performance.view", createPermission: "performance.manage", updatePermission: "performance.manage", tenantScoped: true, orderBy: { createdAt: "desc" }, searchFields: ["title"], filterFields: ["cycleId", "employeeId"] },
  "performance-reviews": { model: "performanceReview", module: "performance", viewPermission: "performance.view", createPermission: "performance.review", updatePermission: "performance.review", tenantScoped: true, orderBy: { createdAt: "desc" }, filterFields: ["cycleId", "employeeId", "reviewerId", "grade", "status"] },
  courses: { model: "course", module: "training", viewPermission: "training.view", createPermission: "training.manage", updatePermission: "training.manage", tenantScoped: true, orderBy: { createdAt: "desc" }, searchFields: ["title", "courseType"], filterFields: ["courseType", "status"] },
  "training-tasks": { model: "trainingTask", module: "training", viewPermission: "training.view", createPermission: "training.manage", updatePermission: "training.manage", tenantScoped: true, orderBy: { createdAt: "desc" }, filterFields: ["courseId", "employeeId", "status"], dateField: "dueAt" },
  notifications: { model: "notification", module: "notifications", viewPermission: "notifications.view", createPermission: "notifications.manage", updatePermission: "notifications.manage", tenantScoped: true, orderBy: { createdAt: "desc" }, searchFields: ["title", "content", "type"], filterFields: ["userId", "type", "status"], dateField: "createdAt" },
  files: { model: "fileAsset", module: "files", viewPermission: "files.view", createPermission: "files.upload", updatePermission: "files.upload", tenantScoped: true, orderBy: { createdAt: "desc" }, searchFields: ["fileName", "ownerType", "mimeType"], filterFields: ["ownerType", "ownerId", "visibility", "uploadedById"], dateField: "createdAt" },
  "audit-logs": { model: "auditLog", module: "audit_logs", viewPermission: "audit_logs.view", tenantScoped: true, orderBy: { createdAt: "desc" }, searchFields: ["module", "targetType", "targetId"], filterFields: ["actorUserId", "action", "module"], dateField: "createdAt" },
  exports: { model: "exportJob", module: "exports", viewPermission: "exports.view", createPermission: "exports.manage", tenantScoped: true, orderBy: { createdAt: "desc" }, searchFields: ["module"] },
  "demo-requests": { model: "demoRequest", module: "platform", viewPermission: "platform.view", updatePermission: "platform.manage_tenants", tenantScoped: false, orderBy: { createdAt: "desc" }, searchFields: ["name", "company", "email"] },
};

function pathKey(parts: string[]) {
  if (parts[0] === "employees") return "employees";
  if (parts[0] === "attendance" && parts[1] === "clock-records") return "clock-records";
  if (parts[0] === "attendance" && parts[1] === "daily") return "attendance-daily";
  if (parts[0] === "attendance" && parts[1] === "monthly") return "attendance-monthly";
  if (parts[0] === "attendance" && parts[1] === "rules") return "attendance-rules";
  if (parts[0] === "attendance" && parts[1] === "shifts") return "shifts";
  if (parts[0] === "attendance" && parts[1] === "schedules") return "schedules";
  if (parts[0] === "leave" && parts[1] === "types") return "leave-types";
  if (parts[0] === "leave" && parts[1] === "balances") return "leave-balances";
  if (parts[0] === "leave" && parts[1] === "requests") return "leave-requests";
  if (parts[0] === "leave" && parts[1] === "overtime") return "overtime";
  if (parts[0] === "leave" && parts[1] === "punch-corrections") return "punch-corrections";
  if (parts[0] === "lifecycle" && (parts[1] === "changes" || parts[1] === "export")) return "lifecycle-changes";
  if (parts[0] === "lifecycle" && ["regularization", "transfer", "salary-adjustment", "termination"].includes(parts[1] ?? "")) return "lifecycle-changes";
  if (parts[0] === "payroll" && parts[1] === "items") return "salary-items";
  if (parts[0] === "payroll" && parts[1] === "structures") return "salary-structures";
  if (parts[0] === "payroll" && parts[1] === "profiles") return "salary-profiles";
  if (parts[0] === "payroll" && parts[1] === "batches") return "salary-batches";
  if (parts[0] === "social-security" && parts[1] === "rules") return "social-security-rules";
  if (parts[0] === "social-security" && parts[1] === "employees") return "social-security-employees";
  if (parts[0] === "social-security" && parts[1] === "export") return "social-security-employees";
  if (parts[0] === "workflows" && parts[1] === "templates") return "workflows";
  if (parts[0] === "workflows" && parts[1] === "instances") return "workflow-instances";
  if (parts[0] === "approvals" && parts[1] === "tasks") return "approvals";
  if (parts[0] === "recruitment" && parts[1] === "requests") return "recruitment-requests";
  if (parts[0] === "recruitment" && parts[1] === "jobs") return "jobs";
  if (parts[0] === "recruitment" && parts[1] === "candidates") return "candidates";
  if (parts[0] === "performance" && parts[1] === "cycles") return "performance-cycles";
  if (parts[0] === "performance" && parts[1] === "goals") return "performance-goals";
  if (parts[0] === "performance" && parts[1] === "reviews") return "performance-reviews";
  if (parts[0] === "training" && parts[1] === "courses") return "courses";
  if (parts[0] === "training" && parts[1] === "tasks") return "training-tasks";
  if (parts[0] === "contracts" && parts[1] === "templates") return "contract-templates";
  if (parts[0] === "cost-centers") return "cost-centers";
  return parts[0] ?? "";
}

function searchWhere(config: ResourceConfig, url: URL) {
  const search = url.searchParams.get("search") ?? url.searchParams.get("q");
  if (!search || !config.searchFields?.length) return {};
  return {
    OR: config.searchFields.map((field) => ({ [field]: { contains: search, mode: "insensitive" } })),
  };
}

function baseWhere(config: ResourceConfig, user: AuthUser, url: URL) {
  const where: Record<string, unknown> = { ...searchWhere(config, url) };
  if (config.tenantScoped && user.tenantId) where.tenantId = user.tenantId;
  const status = url.searchParams.get("status");
  if (status) where[config.statusField ?? "status"] = status;
  for (const field of config.filterFields ?? []) {
    const value = url.searchParams.get(field);
    if (value) where[field] = ["year", "month", "effectiveYear", "headcount"].includes(field) ? Number(value) : value;
  }
  const type = url.searchParams.get("type");
  if (type) {
    for (const candidate of ["type", "contractType", "businessType", "courseType", "employmentType", "clockType", "compensationType"]) {
      if ((config.filterFields ?? []).includes(candidate)) {
        where[candidate] = type;
        break;
      }
    }
  }
  const startDate = url.searchParams.get("startDate");
  const endDate = url.searchParams.get("endDate");
  if (config.dateField && (startDate || endDate)) {
    where[config.dateField] = {
      ...(startDate ? { gte: new Date(startDate) } : {}),
      ...(endDate ? { lte: new Date(endDate) } : {}),
    };
  }
  return where;
}

async function jsonBody(request: NextRequest) {
  const text = await request.text();
  if (!text) return {};
  return JSON.parse(text) as Record<string, unknown>;
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}

function parseCsv(text: string) {
  const normalized = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) return [];
  const headers = parseCsvLine(lines[0]).map((header) => header.replace(/^\uFEFF/, "").trim());
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index]?.trim() ?? ""])) as Record<string, string>;
  });
}

function optionalDate(value: string | undefined) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function normalizedEmploymentType(value: string | undefined) {
  const allowed = ["FULL_TIME", "PART_TIME", "INTERN", "CONTRACTOR", "LABOR_DISPATCH", "TEMPORARY", "CONSULTANT"];
  return allowed.includes(value ?? "") ? value : "FULL_TIME";
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function numberValue(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function dateValue(value: unknown, fallback = new Date()) {
  if (typeof value === "string" && value) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return fallback;
}

function idNumberMasked(value: string | undefined) {
  if (!value) return undefined;
  if (value.length <= 8) return `${value.slice(0, 2)}****${value.slice(-2)}`;
  return `${value.slice(0, 3)}***********${value.slice(-4)}`;
}

function bankMasked(value: string | undefined) {
  if (!value) return undefined;
  return `**** **** **** ${value.slice(-4)}`;
}

async function defaultRefs(tenantId: string) {
  const [company, department, position, costCenter, employee, leaveType, shift, salaryStructure, course, cycle, candidate, request, workflowTemplate, workflowInstance, workflowNode, user] = await Promise.all([
    prisma.company.findFirst({ where: { tenantId }, orderBy: { createdAt: "asc" } }),
    prisma.department.findFirst({ where: { tenantId }, orderBy: { createdAt: "asc" } }),
    prisma.position.findFirst({ where: { tenantId }, orderBy: { createdAt: "asc" } }),
    prisma.costCenter.findFirst({ where: { tenantId }, orderBy: { createdAt: "asc" } }),
    prisma.employee.findFirst({ where: { tenantId }, orderBy: { createdAt: "asc" } }),
    prisma.leaveType.findFirst({ where: { tenantId }, orderBy: { createdAt: "asc" } }),
    prisma.shift.findFirst({ where: { tenantId }, orderBy: { createdAt: "asc" } }),
    prisma.salaryStructure.findFirst({ where: { tenantId }, orderBy: { createdAt: "asc" } }),
    prisma.course.findFirst({ where: { tenantId }, orderBy: { createdAt: "asc" } }),
    prisma.performanceCycle.findFirst({ where: { tenantId }, orderBy: { createdAt: "desc" } }),
    prisma.candidate.findFirst({ where: { tenantId }, orderBy: { createdAt: "desc" } }),
    prisma.recruitmentRequest.findFirst({ where: { tenantId }, orderBy: { createdAt: "desc" } }),
    prisma.workflowTemplate.findFirst({ where: { tenantId }, orderBy: { createdAt: "asc" } }),
    prisma.workflowInstance.findFirst({ where: { tenantId }, orderBy: { createdAt: "desc" } }),
    prisma.workflowNode.findFirst({ where: { tenantId }, orderBy: { createdAt: "asc" } }),
    prisma.user.findFirst({ where: { tenantId }, orderBy: { createdAt: "asc" } }),
  ]);
  return { company, department, position, costCenter, employee, leaveType, shift, salaryStructure, course, cycle, candidate, request, workflowTemplate, workflowInstance, workflowNode, user };
}

function archiveStatusFor(key: string) {
  const statusByKey: Record<string, string> = {
    departments: "ARCHIVED",
    positions: "ARCHIVED",
    "cost-centers": "ARCHIVED",
    companies: "ARCHIVED",
    contracts: "ARCHIVED",
    "contract-templates": "ARCHIVED",
    shifts: "INACTIVE",
    schedules: "ARCHIVED",
    "leave-requests": "CANCELED",
    overtime: "CANCELED",
    "punch-corrections": "CANCELED",
    "salary-items": "ARCHIVED",
    "salary-structures": "ARCHIVED",
    "salary-batches": "ARCHIVED",
    workflows: "ARCHIVED",
    candidates: "TALENT_POOL",
    notifications: "ARCHIVED",
  };
  return statusByKey[key] ?? "ARCHIVED";
}

async function buildCreateData(key: string, parts: string[], body: Record<string, unknown>, user: AuthUser) {
  const tenantId = user.tenantId;
  if (!tenantId) return body;
  const refs = await defaultRefs(tenantId);
  const today = new Date();
  const codeSuffix = Date.now().toString(36).toUpperCase();
  const employeeId = stringValue(body.employeeId, refs.employee?.id ?? user.employeeId ?? "");
  const departmentId = stringValue(body.departmentId, refs.department?.id ?? "");
  const positionId = stringValue(body.positionId, refs.position?.id ?? "");

  switch (key) {
    case "departments":
      return {
        name: stringValue(body.name, "新建部门"),
        code: stringValue(body.code, `D${codeSuffix}`),
        companyId: stringValue(body.companyId, refs.company?.id ?? ""),
        parentId: stringValue(body.parentId) || null,
        managerEmployeeId: stringValue(body.managerEmployeeId, employeeId) || null,
        costCenterId: stringValue(body.costCenterId, refs.costCenter?.id ?? "") || null,
        headcountBudget: numberValue(body.headcountBudget, 10),
        description: stringValue(body.description, "API 创建部门"),
        status: stringValue(body.status, "ACTIVE"),
      };
    case "positions":
      return { name: stringValue(body.name, "新建岗位"), code: stringValue(body.code, `P${codeSuffix}`), departmentId, level: stringValue(body.level, "P"), grade: stringValue(body.grade, "G3"), sequence: stringValue(body.sequence, "Business"), headcountBudget: numberValue(body.headcountBudget, 3), description: stringValue(body.description), requirements: stringValue(body.requirements), status: stringValue(body.status, "ACTIVE") };
    case "cost-centers":
      return { name: stringValue(body.name, "新建成本中心"), code: stringValue(body.code, `CC${codeSuffix}`), ownerEmployeeId: stringValue(body.ownerEmployeeId, employeeId) || null, budget: numberValue(body.budget, 0), status: stringValue(body.status, "ACTIVE") };
    case "onboarding":
      return { employeeId, title: stringValue(body.title, "入职资料提交"), description: stringValue(body.description, "新员工入职任务"), assigneeUserId: stringValue(body.assigneeUserId, refs.user?.id ?? user.id) || null, dueDate: dateValue(body.dueDate, today), status: stringValue(body.status, "PENDING") };
    case "lifecycle-changes": {
      const changeType = parts[1] === "regularization" ? "REGULARIZATION" : parts[1] === "transfer" ? "TRANSFER" : parts[1] === "salary-adjustment" ? "SALARY_ADJUSTMENT" : parts[1] === "termination" ? "TERMINATION" : stringValue(body.changeType, "TRANSFER");
      return { employeeId, changeType, effectiveDate: dateValue(body.effectiveDate, today), reason: stringValue(body.reason, "员工生命周期变动"), createdById: user.id, beforeValue: {}, afterValue: body as Prisma.InputJsonValue };
    }
    case "contracts":
      return { employeeId, templateId: stringValue(body.templateId) || null, contractNo: stringValue(body.contractNo, `HT-${codeSuffix}`), contractType: stringValue(body.contractType, "FIXED_TERM"), startDate: dateValue(body.startDate, today), endDate: dateValue(body.endDate, new Date(today.getFullYear() + 3, today.getMonth(), today.getDate())), signDate: stringValue(body.signDate) ? dateValue(body.signDate) : null, status: stringValue(body.status, "DRAFT"), fileUrl: stringValue(body.fileUrl) || null, renewalReminderDays: numberValue(body.renewalReminderDays, 30) };
    case "contract-templates":
      return { name: stringValue(body.name, "新建合同模板"), contractType: stringValue(body.contractType, "FIXED_TERM"), content: stringValue(body.content, "合同模板内容 {{employeeName}}"), variables: ["employeeName", "department", "position"], status: stringValue(body.status, "ACTIVE") };
    case "clock-records":
      return { employeeId, clockTime: dateValue(body.clockTime, today), clockType: stringValue(body.clockType, "CHECK_IN"), source: stringValue(body.source, "HR_CORRECTION") === "HR_CORRECTION" ? "WEB" : stringValue(body.source, "WEB"), location: stringValue(body.location), deviceId: stringValue(body.deviceId), ip: stringValue(body.ip), status: stringValue(body.status, "NORMAL") };
    case "shifts":
      return { name: stringValue(body.name, "新建班次"), startTime: stringValue(body.startTime, "09:00"), endTime: stringValue(body.endTime, "18:00"), breakMinutes: numberValue(body.breakMinutes, 60), crossDay: body.crossDay === true || body.crossDay === "true", color: stringValue(body.color, "#2563eb"), status: stringValue(body.status, "ACTIVE") };
    case "schedules":
      return { employeeId, shiftId: stringValue(body.shiftId, refs.shift?.id ?? ""), date: dateValue(body.date, today), status: stringValue(body.status, "SCHEDULED") };
    case "leave-requests":
      return { employeeId, leaveTypeId: stringValue(body.leaveTypeId, refs.leaveType?.id ?? ""), startAt: dateValue(body.startAt, today), endAt: dateValue(body.endAt, today), durationHours: numberValue(body.durationHours, 8), reason: stringValue(body.reason, "请假申请"), attachmentUrl: stringValue(body.attachmentUrl) || null, status: stringValue(body.status, "PENDING") };
    case "overtime":
      return { employeeId, startAt: dateValue(body.startAt, today), endAt: dateValue(body.endAt, today), durationHours: numberValue(body.durationHours, 2), compensationType: stringValue(body.compensationType, "PAY"), reason: stringValue(body.reason, "加班申请"), status: stringValue(body.status, "PENDING") };
    case "punch-corrections":
      return { employeeId, date: dateValue(body.date, today), correctionTime: dateValue(body.correctionTime, today), clockType: stringValue(body.clockType, "CHECK_IN"), reason: stringValue(body.reason, "补卡申请"), status: stringValue(body.status, "PENDING") };
    case "salary-items":
      return { name: stringValue(body.name, "新建薪资项目"), code: stringValue(body.code, `SI${codeSuffix}`), type: stringValue(body.type, "EARNING"), taxable: body.taxable !== "false", formula: stringValue(body.formula), description: stringValue(body.description), status: stringValue(body.status, "ACTIVE") };
    case "salary-structures":
      return { name: stringValue(body.name, "新建薪资结构"), description: stringValue(body.description), items: stringValue(body.items) ? stringValue(body.items).split(",") : ["BASE"], status: stringValue(body.status, "ACTIVE") };
    case "salary-profiles":
      return { employeeId, salaryStructureId: stringValue(body.salaryStructureId, refs.salaryStructure?.id ?? ""), baseSalary: numberValue(body.baseSalary, 8000), probationSalary: numberValue(body.probationSalary, 7000), effectiveDate: dateValue(body.effectiveDate, today), status: stringValue(body.status, "ACTIVE") };
    case "salary-batches":
      return { name: stringValue(body.name, `${today.getFullYear()}-${today.getMonth() + 1} 薪资批次`), year: numberValue(body.year, today.getFullYear()), month: numberValue(body.month, today.getMonth() + 1), status: stringValue(body.status, "DRAFT"), createdById: user.id };
    case "social-security-rules":
      return { city: stringValue(body.city, "合肥"), pensionCompanyRate: numberValue(body.pensionCompanyRate, 0.16), pensionPersonalRate: numberValue(body.pensionPersonalRate, 0.08), medicalCompanyRate: numberValue(body.medicalCompanyRate, 0.07), medicalPersonalRate: numberValue(body.medicalPersonalRate, 0.02), unemploymentCompanyRate: numberValue(body.unemploymentCompanyRate, 0.005), unemploymentPersonalRate: numberValue(body.unemploymentPersonalRate, 0.005), injuryCompanyRate: numberValue(body.injuryCompanyRate, 0.003), maternityCompanyRate: numberValue(body.maternityCompanyRate, 0.008), minBase: numberValue(body.minBase, 4227), maxBase: numberValue(body.maxBase, 21133), effectiveYear: numberValue(body.effectiveYear, today.getFullYear()) };
    case "social-security-employees":
      return { employeeId, city: stringValue(body.city, "合肥"), base: numberValue(body.base, 7000), startMonth: stringValue(body.startMonth, `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`), endMonth: stringValue(body.endMonth) || null, status: stringValue(body.status, "ACTIVE") };
    case "workflows":
      return { name: stringValue(body.name, "新建审批流程"), code: stringValue(body.code, `WF${codeSuffix}`), businessType: stringValue(body.businessType, "LEAVE"), description: stringValue(body.description), status: stringValue(body.status, "ACTIVE") };
    case "workflow-instances":
      return { templateId: stringValue(body.templateId, refs.workflowTemplate?.id ?? "") || null, businessType: stringValue(body.businessType, "LEAVE"), businessId: stringValue(body.businessId, `BIZ-${codeSuffix}`), title: stringValue(body.title, "新建审批申请"), initiatorId: employeeId || null, status: stringValue(body.status, "PENDING") };
    case "recruitment-requests":
      return { departmentId, positionId, headcount: numberValue(body.headcount, 1), reason: stringValue(body.reason, "新增编制"), priority: stringValue(body.priority, "MEDIUM"), expectedStartDate: dateValue(body.expectedStartDate, today), status: stringValue(body.status, "PENDING_APPROVAL") };
    case "jobs":
      return { recruitmentRequestId: stringValue(body.recruitmentRequestId, refs.request?.id ?? "") || null, title: stringValue(body.title, "新建招聘职位"), description: stringValue(body.description, "岗位职责"), requirements: stringValue(body.requirements, "任职要求"), salaryMin: numberValue(body.salaryMin, 8000), salaryMax: numberValue(body.salaryMax, 18000), location: stringValue(body.location, "合肥"), status: stringValue(body.status, "OPEN"), publishedAt: dateValue(body.publishedAt, today) };
    case "candidates":
      return { name: stringValue(body.name, "新建候选人"), phone: stringValue(body.phone), email: stringValue(body.email), source: stringValue(body.source, "手动录入"), targetPositionId: stringValue(body.targetPositionId, positionId) || null, status: stringValue(body.status, "NEW"), resumeUrl: stringValue(body.resumeUrl), parsedResume: {}, tags: stringValue(body.tags) ? stringValue(body.tags).split(",") : [] };
    case "performance-cycles":
      return { name: stringValue(body.name, "新建绩效周期"), type: stringValue(body.type, "QUARTER"), startDate: dateValue(body.startDate, today), endDate: dateValue(body.endDate, new Date(today.getFullYear(), today.getMonth() + 3, today.getDate())), status: stringValue(body.status, "DRAFT") };
    case "performance-goals":
      return { cycleId: stringValue(body.cycleId, refs.cycle?.id ?? ""), employeeId, title: stringValue(body.title, "新建绩效目标"), description: stringValue(body.description), weight: numberValue(body.weight, 100), targetValue: stringValue(body.targetValue), actualValue: stringValue(body.actualValue), score: body.score ? numberValue(body.score) : null };
    case "performance-reviews":
      return { cycleId: stringValue(body.cycleId, refs.cycle?.id ?? ""), employeeId, reviewerId: stringValue(body.reviewerId, employeeId) || null, selfReview: stringValue(body.selfReview), managerReview: stringValue(body.managerReview), score: body.score ? numberValue(body.score) : null, grade: stringValue(body.grade), comments: stringValue(body.comments), status: stringValue(body.status, "DRAFT") };
    case "courses":
      return { title: stringValue(body.title, "新建课程"), description: stringValue(body.description), courseType: stringValue(body.courseType, "制度"), contentUrl: stringValue(body.contentUrl), durationMinutes: numberValue(body.durationMinutes, 60), status: stringValue(body.status, "ACTIVE") };
    case "training-tasks":
      return { courseId: stringValue(body.courseId, refs.course?.id ?? ""), employeeId, status: stringValue(body.status, "ASSIGNED"), dueAt: dateValue(body.dueAt, today), score: body.score ? numberValue(body.score) : null };
    case "notifications":
      return { userId: stringValue(body.userId, refs.user?.id ?? user.id), title: stringValue(body.title, "新建通知"), content: stringValue(body.content, "通知内容"), type: stringValue(body.type, "SYSTEM"), status: stringValue(body.status, "UNREAD"), link: stringValue(body.link) || null };
    case "files":
      return { ownerType: stringValue(body.ownerType, "employee"), ownerId: stringValue(body.ownerId, employeeId), fileName: stringValue(body.fileName, "新建文件.pdf"), fileUrl: stringValue(body.fileUrl, "/demo/files/new.pdf"), fileSize: numberValue(body.fileSize, 1024), mimeType: stringValue(body.mimeType, "application/pdf"), visibility: stringValue(body.visibility, "HR_ONLY"), uploadedById: stringValue(body.uploadedById, user.id) || null };
    default:
      return body;
  }
}

const columnLabels: Record<string, string> = {
  id: "ID",
  name: "名称",
  title: "标题",
  code: "编码",
  employeeNo: "工号",
  phone: "手机",
  email: "邮箱",
  status: "状态",
  createdAt: "创建时间",
  updatedAt: "更新时间",
  departmentId: "部门",
  positionId: "岗位",
  employeeId: "员工",
  contractNo: "合同编号",
  contractType: "合同类型",
  startDate: "开始日期",
  endDate: "结束日期",
  signDate: "签署日期",
  clockTime: "打卡时间",
  clockType: "打卡类型",
  source: "来源",
  startAt: "开始时间",
  endAt: "结束时间",
  durationHours: "时长",
  reason: "原因",
  year: "年度",
  month: "月份",
  totalGross: "应发总额",
  totalDeductions: "扣款总额",
  totalNet: "实发总额",
  totalCompanyCost: "公司成本",
  city: "城市",
  businessType: "业务类型",
  type: "类型",
  score: "分数",
  grade: "等级",
  fileName: "文件名",
  module: "模块",
  action: "动作",
  targetType: "对象类型",
  targetId: "对象 ID",
};

function exportColumnsFor(key: string, records: Record<string, unknown>[]): ExportColumn[] {
  const preset: Record<string, ExportColumn[]> = {
    employees: [
      { key: "employeeNo", header: "工号" },
      { key: "name", header: "姓名" },
      { key: "gender", header: "性别" },
      { key: "phone", header: "手机", fieldType: "phone", sensitive: true },
      { key: "email", header: "邮箱" },
      { key: "employmentType", header: "用工类型" },
      { key: "employmentStatus", header: "员工状态" },
      { key: "hireDate", header: "入职日期", fieldType: "date" },
      { key: "probationEndDate", header: "试用期截止", fieldType: "date" },
      { key: "regularizationDate", header: "转正日期", fieldType: "date" },
      { key: "leaveDate", header: "离职日期", fieldType: "date" },
      { key: "workLocation", header: "工作地点" },
      { key: "idNumberMasked", header: "证件号码", fieldType: "idNumber", sensitive: true },
    ],
    contracts: [
      { key: "contractNo", header: "合同编号" },
      { key: "employeeId", header: "员工" },
      { key: "contractType", header: "合同类型" },
      { key: "startDate", header: "开始日期", fieldType: "date" },
      { key: "endDate", header: "结束日期", fieldType: "date" },
      { key: "signDate", header: "签署日期", fieldType: "date" },
      { key: "status", header: "状态" },
      { key: "renewalReminderDays", header: "到期提醒天数" },
    ],
  };
  if (preset[key]) return preset[key];
  const fallbackFields: Record<string, string[]> = {
    departments: ["name", "code", "companyId", "parentId", "managerEmployeeId", "headcountBudget", "status", "updatedAt"],
    positions: ["name", "code", "departmentId", "level", "grade", "sequence", "headcountBudget", "status"],
    "cost-centers": ["name", "code", "ownerEmployeeId", "budget", "status", "updatedAt"],
    onboarding: ["title", "employeeId", "assigneeUserId", "dueDate", "status", "completedAt"],
    "lifecycle-changes": ["changeType", "employeeId", "effectiveDate", "reason", "createdById", "createdAt"],
    "clock-records": ["employeeId", "clockTime", "clockType", "source", "location", "status"],
    shifts: ["name", "startTime", "endTime", "breakMinutes", "crossDay", "status"],
    schedules: ["employeeId", "date", "shiftId", "status", "updatedAt"],
    "attendance-monthly": ["employeeId", "year", "month", "normalDays", "lateCount", "earlyLeaveCount", "missingPunchCount", "absentDays", "leaveHours", "overtimeHours"],
    "leave-requests": ["employeeId", "leaveTypeId", "startAt", "endAt", "durationHours", "reason", "status"],
    overtime: ["employeeId", "startAt", "endAt", "durationHours", "compensationType", "reason", "status"],
    "punch-corrections": ["employeeId", "date", "correctionTime", "clockType", "reason", "status"],
    "salary-items": ["name", "code", "type", "taxable", "formula", "status"],
    "salary-structures": ["name", "description", "items", "status", "updatedAt"],
    "salary-batches": ["name", "year", "month", "status", "totalGross", "totalDeductions", "totalNet", "totalCompanyCost", "publishedAt"],
    "social-security-rules": ["city", "effectiveYear", "pensionCompanyRate", "pensionPersonalRate", "medicalCompanyRate", "medicalPersonalRate", "minBase", "maxBase"],
    "social-security-employees": ["employeeId", "city", "base", "status", "startMonth", "endMonth"],
    workflows: ["name", "code", "businessType", "status", "description", "updatedAt"],
    approvals: ["instanceId", "approverId", "status", "comment", "approvedAt", "createdAt"],
    "recruitment-requests": ["departmentId", "positionId", "headcount", "reason", "priority", "expectedStartDate", "status"],
    jobs: ["title", "location", "salaryMin", "salaryMax", "status", "publishedAt"],
    candidates: ["name", "phone", "email", "source", "targetPositionId", "status", "resumeUrl"],
    "performance-cycles": ["name", "type", "startDate", "endDate", "status"],
    "performance-reviews": ["cycleId", "employeeId", "reviewerId", "score", "grade", "comments", "status"],
    courses: ["title", "courseType", "durationMinutes", "contentUrl", "status"],
    "training-tasks": ["courseId", "employeeId", "assignedAt", "dueAt", "completedAt", "status", "score"],
    notifications: ["title", "type", "userId", "status", "createdAt", "readAt"],
    files: ["fileName", "fileUrl", "mimeType", "fileSize", "ownerType", "ownerId", "visibility", "uploadedById"],
    "audit-logs": ["actorUserId", "module", "action", "targetType", "targetId", "ip", "userAgent", "createdAt"],
  };
  const sampleRecord = records[0] ?? {};
  const fields = Object.keys(sampleRecord).length ? Object.keys(sampleRecord) : (fallbackFields[key] ?? ["id", "createdAt", "status"]);
  return fields
    .filter((key) => !["tenantId", "passwordHash"].includes(key))
    .slice(0, 24)
    .map((field) => ({ key: field, header: columnLabels[field] ?? field, fieldType: field.toLowerCase().includes("salary") ? "salary" : field.toLowerCase().includes("date") || field.endsWith("At") ? "date" : undefined }));
}

async function handleAuth(request: NextRequest, parts: string[]) {
  if (request.method === "POST" && parts[1] === "login") {
    const body = loginSchema.parse(await jsonBody(request));
    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
      return fail("UNAUTHORIZED", "邮箱或密码错误", { status: 401 });
    }
    const token = await setSessionCookie(user.id);
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await writeAuditLog({
      tenantId: user.tenantId,
      actorUserId: user.id,
      action: "LOGIN",
      module: "auth",
      targetType: "User",
      targetId: user.id,
      ip: request.headers.get("x-forwarded-for"),
      userAgent: request.headers.get("user-agent"),
    });
    const authUser = await requireCurrentUser(request);
    return ok({ token, user: authUser, redirectTo: authUser.roles.includes("PLATFORM_ADMIN") ? "/platform" : "/dashboard" });
  }
  if (request.method === "POST" && parts[1] === "demo-login") {
    if (!isDemoLoginEnabled()) return fail("FORBIDDEN", "当前环境未启用演示登录", { status: 403 });
    const body = await jsonBody(request);
    const email = String(body.email ?? "owner@demo.com");
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return fail("NOT_FOUND", "演示账号不存在", { status: 404 });
    const token = await setSessionCookie(user.id);
    const authUser = await requireCurrentUser(request);
    return ok({ token, user: authUser, redirectTo: authUser.roles.includes("PLATFORM_ADMIN") ? "/platform" : "/dashboard" });
  }
  if (request.method === "POST" && parts[1] === "logout") {
    const user = await requireCurrentUser(request);
    await writeAuditLog({ tenantId: user.tenantId, actorUserId: user.id, action: "LOGOUT", module: "auth" });
    await clearSessionCookie();
    return ok({ loggedOut: true });
  }
  if (request.method === "GET" && parts[1] === "me") {
    const user = await requireCurrentUser(request);
    return ok({ user });
  }
  return fail("NOT_FOUND", "接口不存在", { status: 404 });
}

async function handleDemoRequests(request: NextRequest) {
  if (request.method === "POST") {
    const body = demoRequestSchema.parse(await jsonBody(request));
    const demoRequest = await prisma.demoRequest.create({ data: body });
    await writeAuditLog({
      tenantId: null,
      actorUserId: null,
      action: "CREATE",
      module: "demo_request",
      targetType: "DemoRequest",
      targetId: demoRequest.id,
      metadata: { company: body.company, employeeCount: body.employeeCount ?? null },
    });
    return ok({ id: demoRequest.id, status: demoRequest.status }, { status: 201 });
  }

  const user = await requireCurrentUser(request);
  requirePlatformAccess(user);
  if (request.method === "GET") {
    const { page, pageSize, skip, take } = paginationFromUrl(request.nextUrl);
    const [items, total] = await Promise.all([
      prisma.demoRequest.findMany({ orderBy: { createdAt: "desc" }, skip, take }),
      prisma.demoRequest.count(),
    ]);
    return ok({ items, total, page, pageSize });
  }

  return fail("NOT_FOUND", "接口不存在", { status: 404 });
}

async function handleRegister(request: NextRequest) {
  const body = registerSchema.parse(await jsonBody(request));
  const slug = body.companyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);
  const existing = await prisma.tenant.findUnique({ where: { slug } });
  if (existing) return fail("CONFLICT", "企业标识已存在", { status: 409 });
  const tenant = await prisma.tenant.create({
    data: {
      name: body.companyName,
      slug,
      industry: body.industry,
      companySize: body.companySize,
      contactName: body.contactName,
      contactEmail: body.email,
      contactPhone: body.phone,
      status: "ACTIVE",
      settings: { create: { payrollEnabled: true, recruitmentEnabled: true, performanceEnabled: true, trainingEnabled: true } },
    },
  });
  const role = await prisma.role.create({
    data: { tenantId: tenant.id, code: "TENANT_OWNER", name: "企业所有者", isSystem: true },
  });
  const permissions = await prisma.permission.findMany({ select: { id: true } });
  await prisma.rolePermission.createMany({ data: permissions.map((permission) => ({ roleId: role.id, permissionId: permission.id })) });
  const company = await prisma.company.create({ data: { tenantId: tenant.id, name: body.companyName, legalName: body.companyName } });
  const department = await prisma.department.create({ data: { tenantId: tenant.id, companyId: company.id, name: "总经办", code: "D001", headcountBudget: 5 } });
  const position = await prisma.position.create({ data: { tenantId: tenant.id, departmentId: department.id, name: "管理员", code: "P001" } });
  const employee = await prisma.employee.create({
    data: {
      tenantId: tenant.id,
      employeeNo: "E00001",
      name: body.contactName,
      phone: body.phone,
      email: body.email,
      companyId: company.id,
      departmentId: department.id,
      positionId: position.id,
      employmentStatus: "ACTIVE",
      employmentType: "FULL_TIME",
      hireDate: new Date(),
    },
  });
  const { hashPassword } = await import("@/lib/auth");
  const user = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      employeeId: employee.id,
      name: body.contactName,
      email: body.email,
      phone: body.phone,
      passwordHash: await hashPassword(body.password),
      userRoles: { create: { roleId: role.id } },
    },
  });
  await writeAuditLog({ tenantId: tenant.id, actorUserId: user.id, action: "CREATE", module: "tenant", targetType: "Tenant", targetId: tenant.id });
  return ok({ tenantId: tenant.id, userId: user.id }, { status: 201 });
}

async function handlePlatform(request: NextRequest, parts: string[]) {
  const user = await requireCurrentUser(request);
  requirePlatformAccess(user);
  if (parts[1] === "overview") {
    const [tenantCount, activeTenants, userCount, employeeCount, recentTenants] = await Promise.all([
      prisma.tenant.count(),
      prisma.tenant.count({ where: { status: "ACTIVE" } }),
      prisma.user.count(),
      prisma.employee.count(),
      prisma.tenant.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
    ]);
    return ok({ tenantCount, activeTenants, userCount, employeeCount, recentTenants });
  }
  if (parts[1] === "tenants") return ok(await prisma.tenant.findMany({ orderBy: { createdAt: "desc" }, take: 100 }));
  if (parts[1] === "audit") return ok(await prisma.auditLog.findMany({ where: { tenantId: null }, orderBy: { createdAt: "desc" }, take: 100 }));
  return fail("NOT_FOUND", "接口不存在", { status: 404 });
}

async function handleTenant(request: NextRequest, parts: string[]) {
  const user = await requireCurrentUser(request);
  requireTenantAccess(user);
  if (!user.tenantId) return fail("FORBIDDEN", "缺少租户上下文", { status: 403 });
  if (request.method === "GET" && parts[1] === "current") {
    const tenant = await prisma.tenant.findUnique({ where: { id: user.tenantId }, include: { settings: true } });
    return ok({ tenant });
  }
  if (request.method === "PATCH" && parts[1] === "current") {
    assertPermission(user, "tenant.manage");
    const body = await jsonBody(request);
    const tenant = await prisma.tenant.update({
      where: { id: user.tenantId },
      data: { name: String(body.name ?? undefined), contactPhone: body.contactPhone ? String(body.contactPhone) : undefined },
    });
    await writeAuditLog({ tenantId: user.tenantId, actorUserId: user.id, action: "UPDATE", module: "tenant", targetType: "Tenant", targetId: tenant.id });
    return ok({ tenant });
  }
  if (request.method === "GET" && parts[1] === "settings") {
    return ok(await prisma.tenantSetting.findUnique({ where: { tenantId: user.tenantId } }));
  }
  if (request.method === "PATCH" && parts[1] === "settings") {
    assertPermission(user, "settings.manage");
    const body = await jsonBody(request);
    const settings = await prisma.tenantSetting.update({ where: { tenantId: user.tenantId }, data: body });
    await writeAuditLog({ tenantId: user.tenantId, actorUserId: user.id, action: "UPDATE", module: "settings", targetType: "TenantSetting", targetId: settings.id });
    return ok(settings);
  }
  return fail("NOT_FOUND", "接口不存在", { status: 404 });
}

async function handleEmployees(request: NextRequest, parts: string[]) {
  const user = await requireCurrentUser(request);
  requireTenantAccess(user);
  if (!user.tenantId) return fail("FORBIDDEN", "缺少租户上下文", { status: 403 });
  const tenantId = user.tenantId;
  if (request.method === "GET" && parts[1] === "export") {
    assertPermission(user, "employees.export");
    const where = baseWhere(resources.employees, user, request.nextUrl);
    const ids = (request.nextUrl.searchParams.get("ids") ?? request.nextUrl.searchParams.get("selectedIds"))
      ?.split(",")
      .map((id) => id.trim())
      .filter(Boolean);
    if (ids?.length) where.id = { in: ids };
    if (user.roles.includes("EMPLOYEE")) where.id = user.employeeId ?? "__none__";
    const employees = await prisma.employee.findMany({
      where,
      include: { company: true, department: true, position: true, manager: true, costCenter: true, profile: true, contracts: { orderBy: { createdAt: "desc" }, take: 1 } },
      orderBy: { createdAt: "desc" },
      take: 5000,
    });
    const canSensitive = hasPermission(user, "employees.view_sensitive");
    const records = employees.map((employee) => {
      const masked = maskEmployeeFields(employee, canSensitive);
      return {
        employeeNo: employee.employeeNo,
        name: employee.name,
        gender: employee.gender,
        phone: masked.phone,
        email: employee.email,
        company: employee.company.name,
        department: employee.department.name,
        position: employee.position.name,
        manager: employee.manager?.name ?? "",
        employmentType: employee.employmentType,
        employmentStatus: employee.employmentStatus,
        hireDate: employee.hireDate,
        probationEndDate: employee.probationEndDate,
        regularizationDate: employee.regularizationDate,
        leaveDate: employee.leaveDate,
        workLocation: employee.workLocation,
        costCenter: employee.costCenter?.name ?? "",
        contractStatus: employee.contracts[0]?.status ?? "",
        educationLevel: employee.profile?.educationLevel ?? "",
        school: employee.profile?.school ?? "",
        major: employee.profile?.major ?? "",
        emergencyContactPhone: canSensitive ? employee.profile?.emergencyContactPhone : maskSensitiveValue(employee.profile?.emergencyContactPhone, "phone"),
        bankAccount: canSensitive ? employee.profile?.bankAccountMasked : maskSensitiveValue(employee.profile?.bankAccountMasked, "bankAccount"),
      };
    });
    const csv = recordsToCsv(records, [
      { key: "employeeNo", header: "工号" },
      { key: "name", header: "姓名" },
      { key: "gender", header: "性别" },
      { key: "phone", header: "手机", fieldType: "phone", sensitive: true },
      { key: "email", header: "邮箱" },
      { key: "company", header: "公司" },
      { key: "department", header: "部门" },
      { key: "position", header: "岗位" },
      { key: "manager", header: "上级" },
      { key: "employmentType", header: "用工类型" },
      { key: "employmentStatus", header: "员工状态" },
      { key: "hireDate", header: "入职日期", fieldType: "date" },
      { key: "probationEndDate", header: "试用期截止", fieldType: "date" },
      { key: "regularizationDate", header: "转正日期", fieldType: "date" },
      { key: "leaveDate", header: "离职日期", fieldType: "date" },
      { key: "workLocation", header: "工作地点" },
      { key: "costCenter", header: "成本中心" },
      { key: "contractStatus", header: "合同状态" },
      { key: "educationLevel", header: "学历" },
      { key: "school", header: "学校" },
      { key: "major", header: "专业" },
      { key: "emergencyContactPhone", header: "紧急联系人电话", fieldType: "phone", sensitive: true },
      { key: "bankAccount", header: "银行卡", fieldType: "bankAccount", sensitive: true },
    ], user);
    await prisma.exportJob.create({ data: { tenantId: user.tenantId, userId: user.id, module: "employees", status: "COMPLETED", fileUrl: buildExportFilename("employees"), reason: "API export", completedAt: new Date() } });
    await auditExport(user, "employees", Object.fromEntries(request.nextUrl.searchParams.entries()));
    return createCsvResponse(csv, buildExportFilename("employees"));
  }
  if (request.method === "POST" && parts[1] === "import") {
    assertPermission(user, "employees.import");
    const contentType = request.headers.get("content-type") ?? "";
    let csvText = "";
    let reason = "员工批量导入";
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file");
      reason = stringValue(formData.get("reason"), reason);
      if (file instanceof File) csvText = await file.text();
    } else {
      const body = await jsonBody(request);
      csvText = stringValue(body.csv);
      reason = stringValue(body.reason, reason);
    }
    if (!csvText.trim()) {
      return fail("VALIDATION_ERROR", "请上传 CSV 文件或提供 csv 字段", { status: 422 });
    }

    const refs = await defaultRefs(user.tenantId);
    if (!refs.company || !refs.department || !refs.position) {
      return fail("VALIDATION_ERROR", "导入前请先创建公司主体、部门和岗位", { status: 422 });
    }
    const [departments, positions, costCenters] = await Promise.all([
      prisma.department.findMany({ where: { tenantId: user.tenantId } }),
      prisma.position.findMany({ where: { tenantId: user.tenantId } }),
      prisma.costCenter.findMany({ where: { tenantId: user.tenantId } }),
    ]);
    const departmentByName = new Map(departments.map((department) => [department.name.trim().toLowerCase(), department]));
    const positionByName = new Map(positions.map((position) => [position.name.trim().toLowerCase(), position]));
    const costCenterByName = new Map(costCenters.map((costCenter) => [costCenter.name.trim().toLowerCase(), costCenter]));
    const rows = parseCsv(csvText);
    const errors: Array<{ row: number; message: string }> = [];
    let imported = 0;

    for (const [index, row] of rows.entries()) {
      const rowNumber = index + 2;
      const name = stringValue(row.name);
      if (!name) {
        errors.push({ row: rowNumber, message: "name 为必填字段" });
        continue;
      }
      const departmentName = stringValue(row.departmentName).toLowerCase();
      const positionName = stringValue(row.positionName).toLowerCase();
      const costCenterName = stringValue(row.costCenter).toLowerCase() || stringValue(row.costCenterName).toLowerCase();
      const department = departmentName ? departmentByName.get(departmentName) : refs.department;
      const position = positionName ? positionByName.get(positionName) : refs.position;
      const costCenter = costCenterName ? costCenterByName.get(costCenterName) : null;
      if (!department) {
        errors.push({ row: rowNumber, message: `未找到部门：${row.departmentName}` });
        continue;
      }
      if (!position) {
        errors.push({ row: rowNumber, message: `未找到岗位：${row.positionName}` });
        continue;
      }
      if (costCenterName && !costCenter) {
        errors.push({ row: rowNumber, message: `未找到成本中心：${row.costCenter || row.costCenterName}` });
        continue;
      }
      try {
        const employee = await prisma.employee.create({
          data: {
            tenantId: user.tenantId,
            employeeNo: stringValue(row.employeeNo, `IM${Date.now().toString(36).toUpperCase()}${String(index + 1).padStart(4, "0")}`),
            name,
            phone: stringValue(row.phone) || undefined,
            email: stringValue(row.email) || undefined,
            companyId: refs.company.id,
            departmentId: department.id,
            positionId: position.id,
            costCenterId: costCenter?.id,
            employmentType: normalizedEmploymentType(row.employmentType) as Prisma.EmployeeCreateInput["employmentType"],
            employmentStatus: "PROBATION",
            hireDate: optionalDate(row.hireDate) ?? new Date(),
            workLocation: stringValue(row.workLocation) || undefined,
          },
        });
        await prisma.employeeChange.create({
          data: {
            tenantId: user.tenantId,
            employeeId: employee.id,
            changeType: "ONBOARDING",
            effectiveDate: employee.hireDate,
            reason: "CSV 导入创建员工",
            createdById: user.id,
            afterValue: { source: "csv_import", row: rowNumber },
          },
        });
        imported += 1;
      } catch (error) {
        errors.push({ row: rowNumber, message: error instanceof Error ? error.message : "导入失败" });
      }
    }

    const job = await prisma.exportJob.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        module: "employees.import",
        status: errors.length ? "FAILED" : "COMPLETED",
        reason,
        completedAt: new Date(),
      },
    });
    await writeAuditLog({
      tenantId: user.tenantId,
      actorUserId: user.id,
      action: "IMPORT",
      module: "employees",
      targetType: "ExportJob",
      targetId: job.id,
      metadata: { imported, failed: errors.length, errors: errors.slice(0, 20) },
    });
    return ok({ jobId: job.id, imported, failed: errors.length, errors }, { status: imported ? 201 : 422 });
  }
  if (request.method === "POST" && parts[1] === "bulk") {
    const body = await jsonBody(request);
    const ids = Array.isArray(body.ids) ? body.ids.map(String).filter(Boolean) : [];
    const action = stringValue(body.action);
    if (!ids.length) return fail("VALIDATION_ERROR", "请选择员工", { status: 422 });
    if (action === "mark_pending_termination") assertPermission(user, "employees.update");
    else if (action === "archive") assertPermission(user, "employees.delete");
    else return fail("VALIDATION_ERROR", "不支持的批量操作", { status: 422 });
    const affectedEmployees = await prisma.employee.findMany({
      where: { id: { in: ids }, tenantId },
      select: { id: true },
    });
    const affectedIds = affectedEmployees.map((employee) => employee.id);
    if (!affectedIds.length) return fail("NOT_FOUND", "未找到可操作员工", { status: 404 });
    const nextStatus = action === "archive" ? "ARCHIVED" : "PENDING_TERMINATION";
    const result = await prisma.employee.updateMany({
      where: { id: { in: affectedIds }, tenantId },
      data: { employmentStatus: nextStatus },
    });
    await prisma.employeeChange.createMany({
      data: affectedIds.map((employeeId) => ({
        tenantId,
        employeeId,
        changeType: action === "archive" ? "TERMINATION" : "CONTRACT_CHANGE",
        effectiveDate: new Date(),
        reason: action === "archive" ? "批量归档员工" : "批量标记待离职",
        beforeValue: {},
        afterValue: { employmentStatus: nextStatus, bulk: true },
        createdById: user.id,
      })),
    });
    await writeAuditLog({
      tenantId: user.tenantId,
      actorUserId: user.id,
      action: action === "archive" ? "DELETE" : "UPDATE",
      module: "employees",
      targetType: "Employee",
      metadata: { ids: affectedIds, action, affected: result.count, softDelete: action === "archive" },
    });
    return ok({ updated: result.count, action, employmentStatus: nextStatus });
  }
  if (request.method === "GET" && parts[1] && parts[2] === "changes") {
    assertPermission(user, "employees.view");
    return ok(await prisma.employeeChange.findMany({ where: { tenantId: user.tenantId, employeeId: parts[1] }, orderBy: { createdAt: "desc" } }));
  }
  if (request.method === "GET" && parts[1] && parts[2] === "documents") {
    assertPermission(user, "employees.manage_documents");
    return ok(await prisma.employeeDocument.findMany({ where: { tenantId: user.tenantId, employeeId: parts[1] }, orderBy: { createdAt: "desc" } }));
  }
  if (request.method === "GET" && parts[1] && parts[2] === "audit-logs") {
    assertPermission(user, "audit_logs.view");
    return ok(await prisma.auditLog.findMany({ where: { tenantId: user.tenantId, targetId: parts[1] }, orderBy: { createdAt: "desc" } }));
  }
  if (request.method === "GET" && parts[1]) {
    assertPermission(user, "employees.view");
    const employee = await prisma.employee.findFirst({
      where: { id: parts[1], tenantId: user.tenantId },
      include: { company: true, department: true, position: true, profile: true, contracts: true, changes: true, salaryProfiles: true, payslips: { include: { salaryRecord: true } } },
    });
    if (!employee) return fail("NOT_FOUND", "员工不存在", { status: 404 });
    if (user.roles.includes("EMPLOYEE") && user.employeeId !== employee.id) return fail("FORBIDDEN", "普通员工只能查看本人档案", { status: 403 });
    const canSensitive = hasPermission(user, "employees.view_sensitive");
    await writeAuditLog({ tenantId: user.tenantId, actorUserId: user.id, action: canSensitive ? "SENSITIVE_VIEW" : "MASKED_VIEW", module: "employees", targetType: "Employee", targetId: employee.id });
    return ok(maskEmployeeFields(employee, canSensitive));
  }
  if (request.method === "PATCH" && parts[1]) {
    assertPermission(user, "employees.update");
    const body = await jsonBody(request);
    const employee = await prisma.employee.update({
      where: { id: parts[1] },
      data: {
        name: typeof body.name === "string" ? body.name : undefined,
        phone: typeof body.phone === "string" ? body.phone : undefined,
        email: typeof body.email === "string" ? body.email : undefined,
        workLocation: typeof body.workLocation === "string" ? body.workLocation : undefined,
        companyId: typeof body.companyId === "string" ? body.companyId : undefined,
        departmentId: typeof body.departmentId === "string" ? body.departmentId : undefined,
        positionId: typeof body.positionId === "string" ? body.positionId : undefined,
        managerId: typeof body.managerId === "string" ? body.managerId : undefined,
        costCenterId: typeof body.costCenterId === "string" ? body.costCenterId : undefined,
        employmentStatus: body.employmentStatus === "PENDING_TERMINATION" ? "PENDING_TERMINATION" : body.employmentStatus === "ACTIVE" ? "ACTIVE" : body.employmentStatus === "TERMINATED" ? "TERMINATED" : undefined,
      },
    });
    await prisma.employeeChange.create({
      data: {
        tenantId: user.tenantId,
        employeeId: employee.id,
        changeType: "DEPARTMENT_CHANGE",
        effectiveDate: new Date(),
        reason: "员工信息更新",
        beforeValue: {},
        afterValue: body as Prisma.InputJsonValue,
        createdById: user.id,
      },
    });
    await writeAuditLog({ tenantId: user.tenantId, actorUserId: user.id, action: "UPDATE", module: "employees", targetType: "Employee", targetId: employee.id });
    return ok(employee);
  }
  if (request.method === "DELETE" && parts[1]) {
    assertPermission(user, "employees.delete");
    const employee = await prisma.employee.update({ where: { id: parts[1] }, data: { employmentStatus: "ARCHIVED" } });
    await writeAuditLog({ tenantId: user.tenantId, actorUserId: user.id, action: "DELETE", module: "employees", targetType: "Employee", targetId: employee.id, metadata: { softDelete: true, status: "ARCHIVED" } });
    return ok(employee);
  }
  if (request.method === "GET") {
    assertPermission(user, "employees.view");
    const { page, pageSize, skip, take } = paginationFromUrl(request.nextUrl);
    const where = baseWhere(resources.employees ?? { model: "employee", module: "employees", viewPermission: "employees.view", tenantScoped: true }, user, request.nextUrl);
    if (user.roles.includes("EMPLOYEE")) where.id = user.employeeId ?? "__none__";
    const [items, total] = await Promise.all([
      prisma.employee.findMany({ where, include: { department: true, position: true, company: true }, orderBy: { createdAt: "desc" }, skip, take }),
      prisma.employee.count({ where }),
    ]);
    const canSensitive = hasPermission(user, "employees.view_sensitive");
    return ok({ items: items.map((item) => maskEmployeeFields(item, canSensitive)), total, page, pageSize });
  }
  if (request.method === "POST") {
    assertPermission(user, "employees.create");
    const count = await prisma.employee.count({ where: { tenantId: user.tenantId } });
    const body = employeeCreateSchema.parse(await jsonBody(request));
    const fallbackDepartment = await prisma.department.findFirstOrThrow({ where: { tenantId: user.tenantId } });
    const fallbackPosition = await prisma.position.findFirstOrThrow({ where: { tenantId: user.tenantId, departmentId: body.departmentId ?? fallbackDepartment.id } });
    const company = body.companyId ? await prisma.company.findFirstOrThrow({ where: { id: body.companyId, tenantId: user.tenantId } }) : await prisma.company.findFirstOrThrow({ where: { tenantId: user.tenantId } });
    const employee = await prisma.employee.create({
      data: {
        tenantId: user.tenantId,
        employeeNo: body.employeeNo || `N${String(count + 1).padStart(5, "0")}`,
        name: body.name,
        gender: body.gender,
        birthDate: body.birthDate ? new Date(body.birthDate) : undefined,
        email: body.email,
        phone: body.phone,
        idType: body.idType,
        idNumberMasked: idNumberMasked(body.idNumber),
        companyId: company.id,
        departmentId: body.departmentId ?? fallbackDepartment.id,
        positionId: body.positionId ?? fallbackPosition.id,
        managerId: body.managerId || undefined,
        costCenterId: body.costCenterId || undefined,
        avatarUrl: body.avatarUrl || undefined,
        workLocation: body.workLocation,
        employmentType: body.employmentType === "CONTRACTOR" ? "CONTRACTOR" : body.employmentType === "INTERN" ? "INTERN" : body.employmentType === "PART_TIME" ? "PART_TIME" : body.employmentType === "LABOR_DISPATCH" ? "LABOR_DISPATCH" : "FULL_TIME",
        employmentStatus: body.employmentStatus === "ACTIVE" ? "ACTIVE" : body.employmentStatus === "PRE_ONBOARDING" ? "PRE_ONBOARDING" : "PROBATION",
        hireDate: body.hireDate ? new Date(body.hireDate) : new Date(),
        probationEndDate: body.probationEndDate ? new Date(body.probationEndDate) : undefined,
        regularizationDate: body.regularizationDate ? new Date(body.regularizationDate) : undefined,
        leaveDate: body.leaveDate ? new Date(body.leaveDate) : undefined,
        profile: {
          create: {
            tenantId: user.tenantId,
            nationality: body.nationality,
            ethnicity: body.ethnicity,
            maritalStatus: body.maritalStatus,
            educationLevel: body.educationLevel,
            school: body.school,
            major: body.major,
            graduationDate: body.graduationDate ? new Date(body.graduationDate) : undefined,
            emergencyContactName: body.emergencyContactName,
            emergencyContactRelation: body.emergencyContactRelation,
            emergencyContactPhone: body.emergencyContactPhone,
            bankName: body.bankName,
            bankAccountMasked: bankMasked(body.bankAccount),
            address: body.address,
          },
        },
      },
    });
    if (body.school || body.major || body.educationLevel) {
      await prisma.employeeEducation.create({
        data: {
          tenantId: user.tenantId,
          employeeId: employee.id,
          school: body.school || "未填写",
          major: body.major,
          degree: body.educationLevel,
          endDate: body.graduationDate ? new Date(body.graduationDate) : undefined,
        },
      });
    }
    if (body.salaryStructureId && hasPermission(user, "payroll.view_sensitive")) {
      await prisma.employeeSalaryProfile.create({
        data: {
          tenantId: user.tenantId,
          employeeId: employee.id,
          salaryStructureId: body.salaryStructureId,
          baseSalary: body.baseSalary ?? 0,
          probationSalary: body.probationSalary ?? 0,
          effectiveDate: employee.hireDate,
          status: "ACTIVE",
        },
      });
    }
    await prisma.employeeChange.create({ data: { tenantId: user.tenantId, employeeId: employee.id, changeType: "ONBOARDING", effectiveDate: employee.hireDate, createdById: user.id, afterValue: { source: "api" } } });
    await writeAuditLog({ tenantId: user.tenantId, actorUserId: user.id, action: "CREATE", module: "employees", targetType: "Employee", targetId: employee.id });
    return ok(employee, { status: 201 });
  }
  return fail("NOT_FOUND", "接口不存在", { status: 404 });
}

async function handleAnalytics(request: NextRequest, parts: string[]) {
  const user = await requireCurrentUser(request);
  requireTenantAccess(user);
  assertPermission(user, "analytics.view");
  if (!user.tenantId) return fail("FORBIDDEN", "缺少租户上下文", { status: 403 });
  const [headcount, active, probation, contractsExpiring, pendingApprovals, payrollCost] = await Promise.all([
    prisma.employee.count({ where: { tenantId: user.tenantId } }),
    prisma.employee.count({ where: { tenantId: user.tenantId, employmentStatus: "ACTIVE" } }),
    prisma.employee.count({ where: { tenantId: user.tenantId, employmentStatus: "PROBATION" } }),
    prisma.employeeContract.count({ where: { tenantId: user.tenantId, status: "EXPIRING" } }),
    prisma.workflowTask.count({ where: { tenantId: user.tenantId, status: "PENDING" } }),
    prisma.salaryBatch.aggregate({ where: { tenantId: user.tenantId }, _sum: { totalCompanyCost: true } }),
  ]);
  const departmentRows = await prisma.department.findMany({
    where: { tenantId: user.tenantId },
    include: { _count: { select: { employees: true } } },
    orderBy: { code: "asc" },
    take: 12,
  });
  const data = {
    summary: { headcount, active, probation, contractsExpiring, pendingApprovals, payrollCost: payrollCost._sum.totalCompanyCost ?? 0 },
    headcountTrend: Array.from({ length: 6 }, (_, index) => ({ month: `${index + 1}月`, value: Math.max(active - 10 + index * 4, 0) })),
    departmentDistribution: departmentRows.map((department) => ({ name: department.name, value: department._count.employees })),
    payrollTrend: Array.from({ length: 6 }, (_, index) => ({ month: `${index + 1}月`, cost: 300000 + index * 28000 })),
    status: parts[1] ?? "dashboard",
  };
  if (request.method === "GET" && parts[1] === "export") {
    assertPermission(user, "analytics.export");
    const generatedAt = new Date();
    const rows = [
      { metric: "在职人数", period: "当前", department: "全部", value: active, mom: "", yoy: "", generatedAt },
      { metric: "试用期人数", period: "当前", department: "全部", value: probation, mom: "", yoy: "", generatedAt },
      { metric: "合同即将到期", period: "当前", department: "全部", value: contractsExpiring, mom: "", yoy: "", generatedAt },
      ...departmentRows.map((department) => ({ metric: "部门人数分布", period: "当前", department: department.name, value: department._count.employees, mom: "", yoy: "", generatedAt })),
    ];
    const csv = recordsToCsv(rows, [
      { key: "metric", header: "指标名称" },
      { key: "period", header: "统计周期" },
      { key: "department", header: "部门" },
      { key: "value", header: "数值" },
      { key: "mom", header: "环比" },
      { key: "yoy", header: "同比" },
      { key: "generatedAt", header: "生成时间", fieldType: "date" },
    ], user);
    await auditExport(user, "analytics", Object.fromEntries(request.nextUrl.searchParams.entries()));
    return createCsvResponse(csv, buildExportFilename("analytics"));
  }
  return ok(data);
}

async function handleGenericResource(request: NextRequest, parts: string[]) {
  const key = pathKey(parts);
  const config = resources[key];
  if (!config) return fail("NOT_FOUND", "接口不存在", { status: 404 });
  const user = await requireCurrentUser(request);
  if (config.tenantScoped) requireTenantAccess(user);
  const delegate = delegates[config.model];
  if (!delegate) return fail("NOT_FOUND", "资源未配置", { status: 404 });

  if (request.method === "GET" && parts.includes("export")) {
    assertExportAllowed(user, config.module);
    const where = baseWhere(config, user, request.nextUrl);
    const records = applyExportLimit(
      (await delegate.findMany({ where, orderBy: config.orderBy ?? { createdAt: "desc" }, take: 5000 })) as Record<string, unknown>[],
    );
    const csv = recordsToCsv(records, exportColumnsFor(key, records), user);
    const filename = buildExportFilename(config.exportName ?? key);
    if (user.tenantId) {
      await prisma.exportJob.create({
        data: {
          tenantId: user.tenantId,
          userId: user.id,
          module: config.module,
          status: "COMPLETED",
          fileUrl: filename,
          reason: "API export",
          completedAt: new Date(),
        },
      });
    }
    await auditExport(user, config.module, Object.fromEntries(request.nextUrl.searchParams.entries()));
    return createCsvResponse(csv, filename);
  }

  const id = parts.length > 1 && !["templates", "instances", "tasks", "items", "structures", "profiles", "batches", "records", "types", "balances", "requests", "overtime", "punch-corrections", "rules", "employees", "monthly", "daily", "clock-records", "shifts", "schedules", "jobs", "candidates", "cycles", "goals", "reviews", "courses"].includes(parts[1]) ? parts[1] : parts[2] && !["approve", "reject", "cancel", "calculate", "submit", "publish", "complete"].includes(parts[2]) ? parts[2] : undefined;

  if (request.method === "GET" && id) {
    assertPermission(user, config.viewPermission);
    const where = config.tenantScoped && user.tenantId ? { id, tenantId: user.tenantId } : { id };
    const item = await delegate.findFirst({ where });
    if (!item) return fail("NOT_FOUND", "资源不存在", { status: 404 });
    return ok(item);
  }
  if (request.method === "GET") {
    assertPermission(user, config.viewPermission);
    const { page, pageSize, skip, take } = paginationFromUrl(request.nextUrl);
    const where = baseWhere(config, user, request.nextUrl);
    const [items, total] = await Promise.all([
      delegate.findMany({ where, orderBy: config.orderBy ?? { createdAt: "desc" }, skip, take }),
      delegate.count({ where }),
    ]);
    return ok({ items, total, page, pageSize });
  }
  if (request.method === "POST") {
    assertPermission(user, config.createPermission ?? config.updatePermission ?? config.viewPermission);
    const body = await jsonBody(request);
    const normalized = await buildCreateData(key, parts, body, user);
    const data = { ...normalized, ...(config.tenantScoped && user.tenantId ? { tenantId: user.tenantId } : {}) };
    const item = await delegate.create({ data });
    await writeAuditLog({ tenantId: user.tenantId, actorUserId: user.id, action: "CREATE", module: config.module, targetType: config.model, metadata: { key } });
    return ok(item, { status: 201 });
  }
  if (request.method === "PATCH" && id) {
    assertPermission(user, config.updatePermission ?? config.createPermission ?? config.viewPermission);
    const body = await jsonBody(request);
    const item = await delegate.update({ where: { id }, data: body });
    await writeAuditLog({ tenantId: user.tenantId, actorUserId: user.id, action: "UPDATE", module: config.module, targetType: config.model, targetId: id });
    return ok(item);
  }
  if (request.method === "DELETE" && id) {
    assertPermission(user, config.deletePermission ?? config.updatePermission ?? config.createPermission ?? config.viewPermission);
    const where = config.tenantScoped && user.tenantId ? { id, tenantId: user.tenantId } : { id };
    const existing = await delegate.findFirst({ where });
    if (!existing) return fail("NOT_FOUND", "资源不存在", { status: 404 });
    const statusField = config.statusField ?? "status";
    const status = archiveStatusFor(key);
    const item = await delegate.update({ where: { id }, data: { [statusField]: status } });
    await writeAuditLog({
      tenantId: user.tenantId,
      actorUserId: user.id,
      action: "DELETE",
      module: config.module,
      targetType: config.model,
      targetId: id,
      metadata: { softDelete: true, statusField, status },
    });
    return ok(item);
  }
  return fail("NOT_FOUND", "接口不存在", { status: 404 });
}

async function dispatch(request: NextRequest, parts: string[]) {
  if (parts[0] === "health") {
    await prisma.$queryRaw`SELECT 1`;
    return ok({ status: "ok", database: "ok", timestamp: new Date().toISOString(), environment: process.env.NODE_ENV ?? "development" });
  }
  if (parts[0] === "version") {
    const { getVersionInfo } = await import("@/lib/version");
    return ok(getVersionInfo());
  }
  if (parts[0] === "auth") return handleAuth(request, parts);
  if (parts[0] === "register" && request.method === "POST") return handleRegister(request);
  if (parts[0] === "demo-requests") return handleDemoRequests(request);
  if (parts[0] === "platform") return handlePlatform(request, parts);
  if (parts[0] === "tenants") return handleTenant(request, parts);
  if (parts[0] === "employees") return handleEmployees(request, parts);
  if (parts[0] === "analytics") return handleAnalytics(request, parts);
  if (parts[0] === "departments" && request.method === "GET" && parts[1] === "tree") {
    const user = await requireCurrentUser(request);
    requireTenantAccess(user);
    assertPermission(user, "organization.view");
    return ok(await prisma.department.findMany({ where: { tenantId: user.tenantId ?? "" }, orderBy: { code: "asc" } }));
  }
  if (parts[0] === "contracts" && request.method === "GET" && parts[1] === "expiring") {
    const user = await requireCurrentUser(request);
    requireTenantAccess(user);
    assertPermission(user, "contracts.view");
    return ok(await prisma.employeeContract.findMany({ where: { tenantId: user.tenantId ?? "", status: "EXPIRING" }, orderBy: { endDate: "asc" }, take: 50 }));
  }
  if (parts[0] === "contracts" && request.method === "POST" && parts[1] && ["renew", "terminate"].includes(parts[2] ?? "")) {
    const user = await requireCurrentUser(request);
    requireTenantAccess(user);
    assertPermission(user, parts[2] === "renew" ? "contracts.renew" : "contracts.terminate");
    const status = parts[2] === "renew" ? "RENEWED" : "TERMINATED";
    const contract = await prisma.employeeContract.update({ where: { id: parts[1] }, data: { status } });
    await writeAuditLog({ tenantId: user.tenantId, actorUserId: user.id, action: "UPDATE", module: "contracts", targetType: "EmployeeContract", targetId: contract.id });
    return ok(contract);
  }
  if (parts[0] === "attendance" && request.method === "POST" && parts[1] === "clock") {
    const user = await requireCurrentUser(request);
    requireTenantAccess(user);
    assertPermission(user, "attendance.view");
    if (!user.tenantId || !user.employeeId) return fail("FORBIDDEN", "缺少员工上下文", { status: 403 });
    const body = await jsonBody(request);
    const record = await prisma.clockRecord.create({
      data: {
        tenantId: user.tenantId,
        employeeId: user.employeeId,
        clockTime: new Date(),
        clockType: body.clockType === "CHECK_OUT" ? "CHECK_OUT" : "CHECK_IN",
        source: "WEB",
        status: "NORMAL",
        ip: request.headers.get("x-forwarded-for"),
      },
    });
    await writeAuditLog({ tenantId: user.tenantId, actorUserId: user.id, action: "CREATE", module: "attendance", targetType: "ClockRecord", targetId: record.id });
    return ok(record, { status: 201 });
  }
  if (parts[0] === "payroll" && parts[1] === "batches" && parts[2] && parts[3]) {
    const user = await requireCurrentUser(request);
    requireTenantAccess(user);
    const id = parts[2];
    const action = parts[3];
    if (request.method === "GET" && action === "export") {
      assertPermission(user, "payroll.export");
      const records = await prisma.salaryRecord.findMany({ where: { tenantId: user.tenantId ?? "", batchId: id }, include: { employee: true }, orderBy: { createdAt: "desc" } });
      const canSensitive = hasPermission(user, "payroll.view_sensitive");
      const rows = records.map((record) => ({
        employeeNo: record.employee.employeeNo,
        employeeName: record.employee.name,
        grossPay: canSensitive ? record.grossPay : "无权限查看",
        deductions: canSensitive ? record.deductions : "无权限查看",
        netPay: canSensitive ? record.netPay : "无权限查看",
        companyCost: canSensitive ? record.companyCost : "无权限查看",
        status: record.status,
      }));
      const csv = recordsToCsv(rows, [
        { key: "employeeNo", header: "工号" },
        { key: "employeeName", header: "姓名" },
        { key: "grossPay", header: "应发", fieldType: "money", sensitive: true },
        { key: "deductions", header: "扣款", fieldType: "money", sensitive: true },
        { key: "netPay", header: "实发", fieldType: "money", sensitive: true },
        { key: "companyCost", header: "公司成本", fieldType: "money", sensitive: true },
        { key: "status", header: "状态" },
      ], user);
      await auditExport(user, "payroll", { batchId: id });
      return createCsvResponse(csv, buildExportFilename("payroll-batch"));
    }
    const permission =
      action === "calculate"
        ? "payroll.calculate"
        : action === "approve"
          ? "payroll.approve"
          : action === "publish"
            ? "payroll.publish"
            : "payroll.manage";
    assertPermission(user, permission);
    if (request.method === "GET" && action === "records") {
      return ok(await prisma.salaryRecord.findMany({ where: { tenantId: user.tenantId ?? "", batchId: id }, orderBy: { createdAt: "desc" } }));
    }
    const status = action === "calculate" ? "CALCULATED" : action === "submit" ? "PENDING_APPROVAL" : action === "approve" ? "APPROVED" : action === "publish" ? "PUBLISHED" : "DRAFT";
    const batch = await prisma.salaryBatch.update({ where: { id }, data: { status, publishedAt: action === "publish" ? new Date() : undefined } });
    if (action === "publish") {
      await prisma.payslip.updateMany({ where: { tenantId: user.tenantId ?? "", salaryRecord: { batchId: id } }, data: { status: "PUBLISHED", publishedAt: new Date() } });
    }
    await writeAuditLog({ tenantId: user.tenantId, actorUserId: user.id, action: action === "publish" ? "PUBLISH" : "UPDATE", module: "payroll", targetType: "SalaryBatch", targetId: id });
    return ok(batch);
  }
  if (parts[0] === "approvals" && parts[1] === "tasks" && parts[2] && ["approve", "reject", "cancel"].includes(parts[3] ?? "")) {
    const user = await requireCurrentUser(request);
    requireTenantAccess(user);
    assertPermission(user, parts[3] === "approve" ? "approvals.approve" : "approvals.view");
    const status = parts[3] === "approve" ? "APPROVED" : parts[3] === "reject" ? "REJECTED" : "CANCELED";
    const task = await prisma.workflowTask.update({ where: { id: parts[2] }, data: { status, approvedAt: new Date() } });
    await writeAuditLog({ tenantId: user.tenantId, actorUserId: user.id, action: status === "APPROVED" ? "APPROVE" : "REJECT", module: "approvals", targetType: "WorkflowTask", targetId: task.id });
    return ok(task);
  }
  if (parts[0] === "notifications" && request.method === "POST" && parts[1] === "read-all") {
    const user = await requireCurrentUser(request);
    requireTenantAccess(user);
    await prisma.notification.updateMany({ where: { tenantId: user.tenantId ?? "", userId: user.id }, data: { status: "READ", readAt: new Date() } });
    return ok({ readAll: true });
  }
  if (parts[0] === "notifications" && request.method === "POST" && parts[1] && parts[2] === "read") {
    const user = await requireCurrentUser(request);
    requireTenantAccess(user);
    return ok(await prisma.notification.update({ where: { id: parts[1] }, data: { status: "READ", readAt: new Date() } }));
  }
  if (parts[0] === "training" && parts[1] === "tasks" && parts[2] && parts[3] === "complete") {
    const user = await requireCurrentUser(request);
    requireTenantAccess(user);
    assertPermission(user, "training.view");
    return ok(await prisma.trainingTask.update({ where: { id: parts[2] }, data: { status: "COMPLETED", completedAt: new Date(), score: 100 } }));
  }
  if (parts[0] === "recruitment" && parts[1] === "candidates" && parts[2] && parts[3] === "convert-to-onboarding") {
    const user = await requireCurrentUser(request);
    requireTenantAccess(user);
    assertPermission(user, "recruitment.manage");
    const candidate = await prisma.candidate.findUniqueOrThrow({ where: { id: parts[2] } });
    const department = await prisma.department.findFirstOrThrow({ where: { tenantId: user.tenantId ?? "" } });
    const position = await prisma.position.findFirstOrThrow({ where: { tenantId: user.tenantId ?? "" } });
    const company = await prisma.company.findFirstOrThrow({ where: { tenantId: user.tenantId ?? "" } });
    const count = await prisma.employee.count({ where: { tenantId: user.tenantId ?? "" } });
    const employee = await prisma.employee.create({
      data: {
        tenantId: user.tenantId ?? "",
        employeeNo: `C${String(count + 1).padStart(5, "0")}`,
        name: candidate.name,
        phone: candidate.phone,
        email: candidate.email,
        companyId: company.id,
        departmentId: department.id,
        positionId: position.id,
        employmentStatus: "PRE_ONBOARDING",
        employmentType: "FULL_TIME",
        hireDate: new Date(),
      },
    });
    return ok({ employee });
  }
  if (parts[0] === "permissions") {
    const user = await requireCurrentUser(request);
    assertPermission(user, "permissions.view");
    return ok(await prisma.permission.findMany({ orderBy: [{ module: "asc" }, { action: "asc" }] }));
  }
  if (parts[0] === "payslips") {
    const user = await requireCurrentUser(request);
    requireTenantAccess(user);
    if (!user.tenantId) return fail("FORBIDDEN", "缺少租户上下文", { status: 403 });
    if (request.method === "GET" && parts[1]) {
      const payslip = await prisma.payslip.findFirst({ where: { id: parts[1], tenantId: user.tenantId }, include: { salaryRecord: true, employee: true } });
      if (!payslip) return fail("NOT_FOUND", "工资条不存在", { status: 404 });
      if (!hasPermission(user, "payslips.view_all") && payslip.employeeId !== user.employeeId) {
        return fail("FORBIDDEN", "普通员工不能查看他人工资条", { status: 403 });
      }
      await writeAuditLog({ tenantId: user.tenantId, actorUserId: user.id, action: "SENSITIVE_VIEW", module: "payslips", targetType: "Payslip", targetId: payslip.id });
      return ok(hasPermission(user, "payroll.view_sensitive") || payslip.employeeId === user.employeeId ? payslip : { ...payslip, salaryRecord: { ...payslip.salaryRecord, netPay: maskSensitiveValue("salary", "salary") } });
    }
    if (request.method === "POST" && parts[1] && parts[2] === "confirm") {
      assertPermission(user, "payslips.confirm");
      const payslip = await prisma.payslip.update({ where: { id: parts[1] }, data: { status: "CONFIRMED", confirmedAt: new Date() } });
      return ok(payslip);
    }
    const where = hasPermission(user, "payslips.view_all") ? { tenantId: user.tenantId } : { tenantId: user.tenantId, employeeId: user.employeeId ?? "__none__" };
    return ok({ items: await prisma.payslip.findMany({ where, include: { salaryRecord: true }, orderBy: { createdAt: "desc" }, take: 50 }) });
  }
  return handleGenericResource(request, parts);
}

async function route(request: NextRequest, context: Params) {
  const parts = (await context.params).path ?? [];
  try {
    return await dispatch(request, parts);
  } catch (error) {
    if (error instanceof AppError) return fail(error.code, error.message, { status: error.status });
    if (error instanceof ZodError) return fail("VALIDATION_ERROR", error.issues.map((issue) => issue.message).join("; "), { status: 422 });
    console.error(error);
    return fail("INTERNAL_ERROR", "服务端错误", { status: 500 });
  }
}

export async function GET(request: NextRequest, context: Params) {
  return route(request, context);
}

export async function POST(request: NextRequest, context: Params) {
  return route(request, context);
}

export async function PATCH(request: NextRequest, context: Params) {
  return route(request, context);
}

export async function DELETE(request: NextRequest, context: Params) {
  return route(request, context);
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
