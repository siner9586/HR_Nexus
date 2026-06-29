import { prisma } from "./db";
import { formatCurrency, formatDate } from "./format";
import type { AuthUser } from "./permissions";

type Delegate = {
  findMany(args?: unknown): Promise<Record<string, unknown>[]>;
  count(args?: unknown): Promise<number>;
};

const delegates = prisma as unknown as Record<string, Delegate>;

export type ModuleKey =
  | "employees"
  | "organization"
  | "onboarding"
  | "lifecycle"
  | "contracts"
  | "attendance"
  | "leave"
  | "payroll"
  | "payslips"
  | "social-security"
  | "workflows"
  | "approvals"
  | "recruitment"
  | "performance"
  | "training"
  | "analytics"
  | "notifications"
  | "files"
  | "settings"
  | "audit-logs"
  | "billing"
  | "platform";

export const moduleConfig: Record<
  string,
  {
    title: string;
    description: string;
    model?: string;
    columns: string[];
    stats?: string[];
  }
> = {
  employees: { title: "员工档案", description: "统一管理员工主数据、用工状态、组织归属和敏感字段权限。", model: "employee", columns: ["name", "employeeNo", "departmentId", "positionId", "employmentType", "hireDate", "status"] },
  organization: { title: "组织架构", description: "公司主体、部门层级、岗位编制和成本中心在线化管理。", model: "department", columns: ["name", "code", "headcountBudget", "status", "createdAt"] },
  onboarding: { title: "入职管理", description: "预入职、资料收集、任务分派、合同草稿和账号开通闭环。", model: "onboardingTask", columns: ["title", "employeeId", "assigneeUserId", "dueDate", "status"] },
  lifecycle: { title: "员工生命周期", description: "转正、调岗、调薪、离职等员工状态流转和审批记录。", model: "employeeChange", columns: ["changeType", "employeeId", "effectiveDate", "reason", "createdAt"] },
  contracts: { title: "合同中心", description: "合同台账、模板、续签、终止、附件权限和到期预警。", model: "employeeContract", columns: ["contractNo", "employeeId", "contractType", "startDate", "endDate", "status"] },
  attendance: { title: "考勤管理", description: "打卡记录、日考勤、月考勤、班次排班和异常统计。", model: "attendanceDaily", columns: ["employeeId", "date", "status", "lateMinutes", "earlyLeaveMinutes", "absenceMinutes"] },
  leave: { title: "请假加班", description: "请假、加班、补卡、调休和假期余额审批流程。", model: "leaveRequest", columns: ["employeeId", "leaveTypeId", "startAt", "durationHours", "status"] },
  payroll: { title: "薪资管理", description: "薪资项目、薪资结构、薪资批次、成本汇总和工资条发布。", model: "salaryBatch", columns: ["name", "year", "month", "totalGross", "totalNet", "status"] },
  payslips: { title: "工资条", description: "员工本人可查看并确认工资条，薪资敏感访问全量审计。", model: "payslip", columns: ["employeeId", "salaryRecordId", "publishedAt", "confirmedAt", "status"] },
  "social-security": { title: "社保公积金", description: "城市规则、缴费基数、公司/个人比例和参保台账。", model: "employeeSocialSecurity", columns: ["employeeId", "city", "base", "startMonth", "status"] },
  workflows: { title: "流程配置", description: "请假、加班、补卡、入职、转正、调岗、调薪、离职、合同和薪资审批流程。", model: "workflowTemplate", columns: ["name", "code", "businessType", "status", "createdAt"] },
  approvals: { title: "审批中心", description: "我的申请、我的待办、我已处理和审批流时间线。", model: "workflowTask", columns: ["instanceId", "approverId", "status", "comment", "createdAt"] },
  recruitment: { title: "招聘管理", description: "招聘需求、职位、候选人、面试与 Offer 基础版。", model: "candidate", columns: ["name", "phone", "email", "source", "status"] },
  performance: { title: "绩效管理", description: "绩效周期、目标、自评、上级评价、分数和等级分布。", model: "performanceReview", columns: ["employeeId", "reviewerId", "score", "grade", "status"] },
  training: { title: "培训管理", description: "课程库、培训任务、学习状态、完成率和证书记录。", model: "trainingTask", columns: ["courseId", "employeeId", "status", "dueAt", "score"] },
  notifications: { title: "通知中心", description: "系统通知、审批通知、合同到期、转正和套餐提醒。", model: "notification", columns: ["title", "type", "status", "createdAt"] },
  files: { title: "文件中心", description: "文件列表、所属对象、可见范围、上传人和下载权限。", model: "fileAsset", columns: ["fileName", "ownerType", "visibility", "fileSize", "createdAt"] },
  settings: { title: "系统设置", description: "企业配置、角色权限、字段权限、字典、通知和安全设置。", model: "role", columns: ["name", "code", "isSystem", "createdAt"] },
  "audit-logs": { title: "审计日志", description: "操作人、模块、动作、对象、IP、UserAgent 和敏感操作审计。", model: "auditLog", columns: ["action", "module", "targetType", "actorUserId", "createdAt"] },
};

export function serializeRows(rows: Record<string, unknown>[]) {
  return JSON.parse(JSON.stringify(rows)) as Record<string, unknown>[];
}

export async function getDashboardData(user: AuthUser) {
  const tenantId = user.tenantId;
  if (!tenantId) {
    const [tenantCount, subscriptionCount] = await Promise.all([prisma.tenant.count(), prisma.subscription.count()]);
    return {
      stats: [
        { title: "租户总数", value: tenantCount },
        { title: "订阅总数", value: subscriptionCount },
        { title: "MRR", value: formatCurrency(3998) },
        { title: "平台审计", value: await prisma.auditLog.count({ where: { tenantId: null } }) },
      ],
      departmentDistribution: [],
      trend: [],
      tasks: [],
      changes: [],
    };
  }
  const [headcount, onboarded, terminated, approvals, expiringContracts, attendanceIssues, payroll, tenant] =
    await Promise.all([
      prisma.employee.count({ where: { tenantId } }),
      prisma.employee.count({ where: { tenantId, hireDate: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } } }),
      prisma.employee.count({ where: { tenantId, employmentStatus: "TERMINATED" } }),
      prisma.workflowTask.count({ where: { tenantId, status: "PENDING" } }),
      prisma.employeeContract.count({ where: { tenantId, status: "EXPIRING" } }),
      prisma.attendanceDaily.count({ where: { tenantId, status: { not: "NORMAL" } } }),
      prisma.salaryBatch.aggregate({ where: { tenantId }, _sum: { totalCompanyCost: true } }),
      prisma.tenant.findUnique({ where: { id: tenantId }, include: { subscriptions: { include: { plan: true }, orderBy: { createdAt: "desc" }, take: 1 } } }),
    ]);
  const departments = await prisma.department.findMany({
    where: { tenantId },
    include: { _count: { select: { employees: true } } },
    orderBy: { code: "asc" },
    take: 10,
  });
  const changes = await prisma.employeeChange.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" }, take: 8 });
  const tasks = await prisma.workflowTask.findMany({ where: { tenantId, status: "PENDING" }, orderBy: { createdAt: "desc" }, take: 8 });
  const employeeLimit = tenant?.subscriptions[0]?.plan.maxEmployees ?? null;
  return {
    stats: [
      { title: "在职人数", value: headcount },
      { title: "本月入职", value: onboarded },
      { title: "已离职", value: terminated },
      { title: "待审批", value: approvals },
      { title: "合同即将到期", value: expiringContracts },
      { title: "考勤异常", value: attendanceIssues },
      { title: "本月薪资成本", value: formatCurrency(Number(payroll._sum.totalCompanyCost ?? 0)) },
      { title: "当前套餐", value: tenant?.plan ?? "-" },
      { title: "员工用量", value: employeeLimit ? `${headcount}/${employeeLimit}` : `${headcount}/不限` },
    ],
    departmentDistribution: departments.map((department) => ({ name: department.name, value: department._count.employees })),
    trend: Array.from({ length: 6 }, (_, index) => ({ month: `${index + 1}月`, headcount: Math.max(headcount - 20 + index * 4, 0), cost: 200000 + index * 30000 })),
    tasks: serializeRows(tasks),
    changes: serializeRows(changes),
  };
}

export async function getModuleRows(user: AuthUser, moduleKey: string) {
  const config = moduleConfig[moduleKey];
  if (!config?.model) return { rows: [], total: 0 };
  const delegate = delegates[config.model];
  const tenantId = user.tenantId;
  const where = tenantId ? { tenantId } : {};
  const [rows, total] = await Promise.all([
    delegate.findMany({ where, orderBy: { createdAt: "desc" }, take: 20 }),
    delegate.count({ where }),
  ]);
  return { rows: serializeRows(rows), total };
}

export function displayValue(value: unknown) {
  if (value === null || value === undefined) return "-";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) return formatDate(value);
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
