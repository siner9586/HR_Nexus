import type { Prisma, TenantPlan } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { ok, fail, paginationFromUrl } from "@/lib/api-response";
import { writeAuditLog } from "@/lib/audit";
import { clearSessionCookie, requireCurrentUser, setSessionCookie, verifyPassword } from "@/lib/auth";
import { createCheckoutSession, createPortalSession, getBillingOverview } from "@/lib/billing";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { maskEmployeeFields, maskSensitiveValue } from "@/lib/masking";
import { assertPermission, hasPermission, type AuthUser } from "@/lib/permissions";
import { isDemoLoginEnabled } from "@/lib/runtime-env";
import { getStripeClient, isBillingMockMode } from "@/lib/stripe";
import { assertPlanEmployeeLimit, requireBillingAccess, requirePlatformAccess, requireTenantAccess } from "@/lib/tenant";
import { checkoutSchema, demoRequestSchema, employeeCreateSchema, loginSchema, registerSchema } from "@/lib/validators";

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
  orderBy?: Record<string, "asc" | "desc">;
  searchFields?: string[];
  tenantScoped?: boolean;
};

const resources: Record<string, ResourceConfig> = {
  users: { model: "user", module: "users", viewPermission: "users.view", createPermission: "users.manage", updatePermission: "users.manage", tenantScoped: true, orderBy: { createdAt: "desc" }, searchFields: ["name", "email", "phone"] },
  roles: { model: "role", module: "roles", viewPermission: "roles.view", createPermission: "roles.manage", updatePermission: "roles.manage", tenantScoped: true, orderBy: { createdAt: "desc" }, searchFields: ["name", "code"] },
  companies: { model: "company", module: "organization", viewPermission: "organization.view", createPermission: "organization.manage", updatePermission: "organization.manage", tenantScoped: true, orderBy: { createdAt: "desc" }, searchFields: ["name", "legalName"] },
  departments: { model: "department", module: "organization", viewPermission: "organization.view", createPermission: "organization.manage", updatePermission: "organization.manage", deletePermission: "organization.manage", tenantScoped: true, orderBy: { code: "asc" }, searchFields: ["name", "code"] },
  positions: { model: "position", module: "organization", viewPermission: "organization.view", createPermission: "organization.manage", updatePermission: "organization.manage", deletePermission: "organization.manage", tenantScoped: true, orderBy: { code: "asc" }, searchFields: ["name", "code"] },
  "cost-centers": { model: "costCenter", module: "organization", viewPermission: "organization.view", createPermission: "organization.manage", tenantScoped: true, orderBy: { createdAt: "desc" }, searchFields: ["name", "code"] },
  onboarding: { model: "onboardingTask", module: "onboarding", viewPermission: "onboarding.view", createPermission: "onboarding.manage", updatePermission: "onboarding.manage", tenantScoped: true, orderBy: { createdAt: "desc" }, searchFields: ["title", "status"] },
  contracts: { model: "employeeContract", module: "contracts", viewPermission: "contracts.view", createPermission: "contracts.create", updatePermission: "contracts.update", tenantScoped: true, orderBy: { createdAt: "desc" }, searchFields: ["contractNo"] },
  "contract-templates": { model: "contractTemplate", module: "contracts", viewPermission: "contracts.view", createPermission: "contracts.create", updatePermission: "contracts.update", tenantScoped: true, orderBy: { createdAt: "desc" }, searchFields: ["name"] },
  "attendance-rules": { model: "attendanceRule", module: "attendance", viewPermission: "attendance.view", createPermission: "attendance.manage", tenantScoped: true, orderBy: { createdAt: "desc" }, searchFields: ["name"] },
  shifts: { model: "shift", module: "attendance", viewPermission: "attendance.view", createPermission: "attendance.manage", tenantScoped: true, orderBy: { createdAt: "desc" }, searchFields: ["name"] },
  schedules: { model: "schedule", module: "attendance", viewPermission: "attendance.view", createPermission: "attendance.manage", tenantScoped: true, orderBy: { date: "desc" } },
  "clock-records": { model: "clockRecord", module: "attendance", viewPermission: "attendance.view", createPermission: "attendance.manage", tenantScoped: true, orderBy: { clockTime: "desc" } },
  "attendance-daily": { model: "attendanceDaily", module: "attendance", viewPermission: "attendance.view", tenantScoped: true, orderBy: { date: "desc" } },
  "attendance-monthly": { model: "attendanceMonthly", module: "attendance", viewPermission: "attendance.view", tenantScoped: true, orderBy: { year: "desc" } },
  "leave-types": { model: "leaveType", module: "leave", viewPermission: "leave.view", createPermission: "leave.manage", tenantScoped: true, orderBy: { createdAt: "desc" }, searchFields: ["name", "code"] },
  "leave-balances": { model: "leaveBalance", module: "leave", viewPermission: "leave.view", tenantScoped: true, orderBy: { createdAt: "desc" } },
  "leave-requests": { model: "leaveRequest", module: "leave", viewPermission: "leave.view", createPermission: "leave.apply", updatePermission: "leave.manage", tenantScoped: true, orderBy: { createdAt: "desc" } },
  overtime: { model: "overtimeRequest", module: "leave", viewPermission: "leave.view", createPermission: "leave.apply", tenantScoped: true, orderBy: { createdAt: "desc" } },
  "punch-corrections": { model: "punchCorrection", module: "leave", viewPermission: "leave.view", createPermission: "leave.apply", tenantScoped: true, orderBy: { createdAt: "desc" } },
  "salary-items": { model: "salaryItem", module: "payroll", viewPermission: "payroll.view", createPermission: "payroll.manage", tenantScoped: true, orderBy: { createdAt: "desc" }, searchFields: ["name", "code"] },
  "salary-structures": { model: "salaryStructure", module: "payroll", viewPermission: "payroll.view", createPermission: "payroll.manage", tenantScoped: true, orderBy: { createdAt: "desc" }, searchFields: ["name"] },
  "salary-profiles": { model: "employeeSalaryProfile", module: "payroll", viewPermission: "payroll.view", createPermission: "payroll.manage", tenantScoped: true, orderBy: { createdAt: "desc" } },
  "salary-batches": { model: "salaryBatch", module: "payroll", viewPermission: "payroll.view", createPermission: "payroll.manage", updatePermission: "payroll.manage", tenantScoped: true, orderBy: { createdAt: "desc" }, searchFields: ["name"] },
  "salary-records": { model: "salaryRecord", module: "payroll", viewPermission: "payroll.view", tenantScoped: true, orderBy: { createdAt: "desc" } },
  "social-security-rules": { model: "socialSecurityRule", module: "social_security", viewPermission: "social_security.view", createPermission: "social_security.manage", tenantScoped: true, orderBy: { createdAt: "desc" }, searchFields: ["city"] },
  "social-security-employees": { model: "employeeSocialSecurity", module: "social_security", viewPermission: "social_security.view", createPermission: "social_security.manage", tenantScoped: true, orderBy: { createdAt: "desc" } },
  workflows: { model: "workflowTemplate", module: "workflows", viewPermission: "workflows.view", createPermission: "workflows.manage", updatePermission: "workflows.manage", tenantScoped: true, orderBy: { createdAt: "desc" }, searchFields: ["name", "code"] },
  "workflow-instances": { model: "workflowInstance", module: "workflows", viewPermission: "workflows.view", createPermission: "workflows.manage", tenantScoped: true, orderBy: { createdAt: "desc" }, searchFields: ["title"] },
  approvals: { model: "workflowTask", module: "approvals", viewPermission: "approvals.view", tenantScoped: true, orderBy: { createdAt: "desc" } },
  "recruitment-requests": { model: "recruitmentRequest", module: "recruitment", viewPermission: "recruitment.view", createPermission: "recruitment.manage", tenantScoped: true, orderBy: { createdAt: "desc" } },
  jobs: { model: "jobPosting", module: "recruitment", viewPermission: "recruitment.view", createPermission: "recruitment.manage", tenantScoped: true, orderBy: { createdAt: "desc" }, searchFields: ["title"] },
  candidates: { model: "candidate", module: "recruitment", viewPermission: "recruitment.view", createPermission: "recruitment.manage", updatePermission: "recruitment.manage", tenantScoped: true, orderBy: { createdAt: "desc" }, searchFields: ["name", "phone", "email"] },
  "performance-cycles": { model: "performanceCycle", module: "performance", viewPermission: "performance.view", createPermission: "performance.manage", tenantScoped: true, orderBy: { createdAt: "desc" }, searchFields: ["name"] },
  "performance-goals": { model: "performanceGoal", module: "performance", viewPermission: "performance.view", createPermission: "performance.manage", tenantScoped: true, orderBy: { createdAt: "desc" }, searchFields: ["title"] },
  "performance-reviews": { model: "performanceReview", module: "performance", viewPermission: "performance.view", createPermission: "performance.review", tenantScoped: true, orderBy: { createdAt: "desc" } },
  courses: { model: "course", module: "training", viewPermission: "training.view", createPermission: "training.manage", tenantScoped: true, orderBy: { createdAt: "desc" }, searchFields: ["title"] },
  "training-tasks": { model: "trainingTask", module: "training", viewPermission: "training.view", createPermission: "training.manage", tenantScoped: true, orderBy: { createdAt: "desc" } },
  notifications: { model: "notification", module: "notifications", viewPermission: "notifications.view", createPermission: "notifications.manage", tenantScoped: true, orderBy: { createdAt: "desc" }, searchFields: ["title", "content"] },
  files: { model: "fileAsset", module: "files", viewPermission: "files.view", createPermission: "files.upload", tenantScoped: true, orderBy: { createdAt: "desc" }, searchFields: ["fileName", "ownerType"] },
  "audit-logs": { model: "auditLog", module: "audit_logs", viewPermission: "audit_logs.view", tenantScoped: true, orderBy: { createdAt: "desc" }, searchFields: ["module", "targetType"] },
  exports: { model: "exportJob", module: "exports", viewPermission: "exports.view", createPermission: "exports.manage", tenantScoped: true, orderBy: { createdAt: "desc" }, searchFields: ["module"] },
  "demo-requests": { model: "demoRequest", module: "platform", viewPermission: "platform.view", updatePermission: "platform.manage_tenants", tenantScoped: false, orderBy: { createdAt: "desc" }, searchFields: ["name", "company", "email"] },
};

function pathKey(parts: string[]) {
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
  if (parts[0] === "payroll" && parts[1] === "items") return "salary-items";
  if (parts[0] === "payroll" && parts[1] === "structures") return "salary-structures";
  if (parts[0] === "payroll" && parts[1] === "profiles") return "salary-profiles";
  if (parts[0] === "payroll" && parts[1] === "batches") return "salary-batches";
  if (parts[0] === "social-security" && parts[1] === "rules") return "social-security-rules";
  if (parts[0] === "social-security" && parts[1] === "employees") return "social-security-employees";
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
  const where: Prisma.JsonObject = { ...searchWhere(config, url) };
  if (config.tenantScoped && user.tenantId) where.tenantId = user.tenantId;
  const status = url.searchParams.get("status");
  if (status) where.status = status;
  return where;
}

async function jsonBody(request: NextRequest) {
  const text = await request.text();
  if (!text) return {};
  return JSON.parse(text) as Record<string, unknown>;
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
  const freePlan = await prisma.plan.findUniqueOrThrow({ where: { code: "FREE" } });
  const tenant = await prisma.tenant.create({
    data: {
      name: body.companyName,
      slug,
      industry: body.industry,
      companySize: body.companySize,
      contactName: body.contactName,
      contactEmail: body.email,
      contactPhone: body.phone,
      plan: "FREE",
      status: "TRIAL",
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      settings: { create: { payrollEnabled: false, recruitmentEnabled: false, performanceEnabled: false, trainingEnabled: false } },
      subscriptions: { create: { planId: freePlan.id, status: "MOCK", amount: 0, seats: 1, interval: "month" } },
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
    const [tenantCount, activeTenants, plans, subscriptions, recentTenants] = await Promise.all([
      prisma.tenant.count(),
      prisma.tenant.count({ where: { status: "ACTIVE" } }),
      prisma.plan.findMany({ orderBy: { sortOrder: "asc" } }),
      prisma.subscription.findMany({ include: { tenant: true, plan: true }, orderBy: { createdAt: "desc" }, take: 20 }),
      prisma.tenant.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
    ]);
    const mrr = subscriptions.reduce((sum, subscription) => sum + Number(subscription.amount), 0);
    return ok({ tenantCount, activeTenants, expiredTenants: 0, totalSeats: subscriptions.reduce((sum, item) => sum + item.seats, 0), mrr, arr: mrr * 12, plans, subscriptions, recentTenants });
  }
  if (parts[1] === "tenants") return ok(await prisma.tenant.findMany({ orderBy: { createdAt: "desc" }, take: 100 }));
  if (parts[1] === "plans") return ok(await prisma.plan.findMany({ orderBy: { sortOrder: "asc" } }));
  if (parts[1] === "subscriptions") return ok(await prisma.subscription.findMany({ include: { tenant: true, plan: true }, orderBy: { createdAt: "desc" }, take: 100 }));
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
  if (request.method === "GET" && parts[1] === "export") {
    assertPermission(user, "employees.export");
    const job = await prisma.exportJob.create({ data: { tenantId: user.tenantId, userId: user.id, module: "employees", status: "COMPLETED", fileUrl: "/demo/exports/employees.csv", reason: "API export" } });
    await writeAuditLog({ tenantId: user.tenantId, actorUserId: user.id, action: "EXPORT", module: "employees", targetType: "ExportJob", targetId: job.id });
    return ok({ job, url: job.fileUrl });
  }
  if (request.method === "GET" && parts[1] && parts[2] === "changes") {
    assertPermission(user, "employees.view");
    return ok(await prisma.employeeChange.findMany({ where: { tenantId: user.tenantId, employeeId: parts[1] }, orderBy: { createdAt: "desc" } }));
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
    await writeAuditLog({ tenantId: user.tenantId, actorUserId: user.id, action: "DELETE", module: "employees", targetType: "Employee", targetId: employee.id });
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
    const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: user.tenantId } });
    const count = await prisma.employee.count({ where: { tenantId: user.tenantId } });
    assertPlanEmployeeLimit(tenant.plan, count);
    const body = employeeCreateSchema.parse(await jsonBody(request));
    const fallbackDepartment = await prisma.department.findFirstOrThrow({ where: { tenantId: user.tenantId } });
    const fallbackPosition = await prisma.position.findFirstOrThrow({ where: { tenantId: user.tenantId, departmentId: body.departmentId ?? fallbackDepartment.id } });
    const company = await prisma.company.findFirstOrThrow({ where: { tenantId: user.tenantId } });
    const employee = await prisma.employee.create({
      data: {
        tenantId: user.tenantId,
        employeeNo: `N${String(count + 1).padStart(5, "0")}`,
        name: body.name,
        email: body.email,
        phone: body.phone,
        companyId: company.id,
        departmentId: body.departmentId ?? fallbackDepartment.id,
        positionId: body.positionId ?? fallbackPosition.id,
        employmentType: body.employmentType === "CONTRACTOR" ? "CONTRACTOR" : "FULL_TIME",
        employmentStatus: "PROBATION",
        hireDate: body.hireDate ? new Date(body.hireDate) : new Date(),
      },
    });
    await prisma.employeeChange.create({ data: { tenantId: user.tenantId, employeeId: employee.id, changeType: "ONBOARDING", effectiveDate: employee.hireDate, createdById: user.id, afterValue: { source: "api" } } });
    await writeAuditLog({ tenantId: user.tenantId, actorUserId: user.id, action: "CREATE", module: "employees", targetType: "Employee", targetId: employee.id });
    return ok(employee, { status: 201 });
  }
  return fail("NOT_FOUND", "接口不存在", { status: 404 });
}

async function handleBilling(request: NextRequest, parts: string[]) {
  if (request.method === "POST" && parts[1] === "webhook") {
    const rawBody = await request.text();
    const stripe = getStripeClient();
    let event: { id: string; type: string; data?: { object?: Record<string, unknown> } };
    if (!isBillingMockMode() && stripe && process.env.STRIPE_WEBHOOK_SECRET) {
      const signature = request.headers.get("stripe-signature");
      if (!signature) return fail("BAD_REQUEST", "缺少 Stripe 签名", { status: 400 });
      event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET) as unknown as typeof event;
    } else {
      event = JSON.parse(rawBody || "{}") as typeof event;
      event.id = event.id ?? `evt_mock_${Date.now()}`;
      event.type = event.type ?? "checkout.session.completed";
    }
    const metadata = (event.data?.object?.metadata ?? {}) as Record<string, string>;
    const tenantId = metadata.tenantId ?? null;
    const exists = await prisma.billingEvent.findUnique({ where: { stripeEventId: event.id } });
    if (exists) return ok({ duplicate: true });
    await prisma.billingEvent.create({ data: { tenantId, stripeEventId: event.id, type: event.type, payload: event as Prisma.InputJsonValue, processedAt: new Date() } });
    if (tenantId && ["checkout.session.completed", "customer.subscription.created", "customer.subscription.updated"].includes(event.type)) {
      const planCode = (metadata.planCode as TenantPlan | undefined) ?? "PROFESSIONAL";
      const plan = await prisma.plan.findUnique({ where: { code: planCode } });
      if (plan) {
        await prisma.tenant.update({ where: { id: tenantId }, data: { plan: plan.code, status: "ACTIVE" } });
        await prisma.subscription.upsert({
          where: { id: `${tenantId}_${plan.id}` },
          update: { planId: plan.id, status: "ACTIVE" },
          create: { id: `${tenantId}_${plan.id}`, tenantId, planId: plan.id, status: "ACTIVE", amount: plan.priceMonthly },
        });
      }
    }
    await writeAuditLog({ tenantId, action: "BILLING_WEBHOOK", module: "billing", targetType: "BillingEvent", targetId: event.id, metadata: { type: event.type } });
    return ok({ received: true, type: event.type });
  }

  const user = await requireCurrentUser(request);
  requireTenantAccess(user);
  if (!user.tenantId) return fail("FORBIDDEN", "缺少租户上下文", { status: 403 });
  if (request.method === "GET" && parts[1] === "current") {
    assertPermission(user, "billing.view");
    return ok(await getBillingOverview(user.tenantId));
  }
  if (request.method === "GET" && parts[1] === "plans") {
    return ok(await prisma.plan.findMany({ where: { isPublic: true }, orderBy: { sortOrder: "asc" } }));
  }
  if (request.method === "GET" && parts[1] === "invoices") {
    assertPermission(user, "billing.view");
    return ok(await prisma.invoice.findMany({ where: { tenantId: user.tenantId }, orderBy: { createdAt: "desc" } }));
  }
  if (request.method === "POST" && parts[1] === "checkout") {
    assertPermission(user, "billing.checkout");
    const body = checkoutSchema.parse(await jsonBody(request));
    const session = await createCheckoutSession({ tenantId: user.tenantId, planCode: body.planCode, interval: body.interval, appUrl: process.env.APP_URL ?? request.nextUrl.origin });
    await writeAuditLog({ tenantId: user.tenantId, actorUserId: user.id, action: "BILLING_CHECKOUT", module: "billing", metadata: body });
    return ok(session);
  }
  if (request.method === "POST" && parts[1] === "portal") {
    requireBillingAccess(user);
    const portal = await createPortalSession({ tenantId: user.tenantId, appUrl: process.env.APP_URL ?? request.nextUrl.origin });
    await writeAuditLog({ tenantId: user.tenantId, actorUserId: user.id, action: "BILLING_PORTAL", module: "billing" });
    return ok(portal);
  }
  if (request.method === "POST" && parts[1] === "mock-upgrade") {
    assertPermission(user, "billing.manage");
    const body = await jsonBody(request);
    const planCode = String(body.planCode ?? "PROFESSIONAL") as TenantPlan;
    const plan = await prisma.plan.findUniqueOrThrow({ where: { code: planCode } });
    await prisma.tenant.update({ where: { id: user.tenantId }, data: { plan: plan.code, status: "ACTIVE" } });
    await prisma.subscription.create({ data: { tenantId: user.tenantId, planId: plan.id, status: "MOCK", amount: plan.priceMonthly, seats: 1 } });
    return ok({ upgraded: true, planCode });
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
    const data = { ...body, ...(config.tenantScoped && user.tenantId ? { tenantId: user.tenantId } : {}) };
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
    const item = await delegate.delete({ where: { id } });
    await writeAuditLog({ tenantId: user.tenantId, actorUserId: user.id, action: "DELETE", module: config.module, targetType: config.model, targetId: id });
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
  if (parts[0] === "billing") return handleBilling(request, parts);
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
