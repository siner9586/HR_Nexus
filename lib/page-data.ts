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
  | "platform";

export type ModuleCreateField = {
  name: string;
  label: string;
  type?: "text" | "number" | "date" | "datetime-local" | "email" | "url";
  required?: boolean;
  placeholder?: string;
};

export type ModuleConfig = {
  title: string;
  description: string;
  model?: string;
  columns: string[];
  apiPath?: string;
  createTitle?: string;
  createFields?: ModuleCreateField[];
  createPermission?: string;
  exportPermission?: string;
  deletePermission?: string;
  statusField?: string;
  dateField?: string;
  filterFields?: string[];
};

const commonStatusFilter = ["status"];
const createText = (name: string, label: string, required = false): ModuleCreateField => ({ name, label, required });

export const moduleConfig: Record<string, ModuleConfig> = {
  organization: { title: "组织架构", description: "公司主体、部门层级、岗位编制和成本中心在线化管理。", model: "department", apiPath: "/api/departments", columns: ["name", "code", "companyId", "parentId", "managerEmployeeId", "headcountBudget", "status", "updatedAt"], createTitle: "新建部门", createPermission: "organization.manage", exportPermission: "organization.export", deletePermission: "organization.manage", filterFields: ["companyId", "parentId", "managerEmployeeId", ...commonStatusFilter], createFields: [createText("name", "部门名称", true), createText("code", "部门编码", true), createText("headcountBudget", "编制人数"), createText("description", "描述")] },
  "organization-positions": { title: "岗位管理", description: "岗位编码、职级职等、序列、编制和任职要求。", model: "position", apiPath: "/api/positions", columns: ["name", "code", "departmentId", "level", "grade", "sequence", "headcountBudget", "status"], createTitle: "新建岗位", createPermission: "organization.manage", exportPermission: "organization.export", deletePermission: "organization.manage", filterFields: ["departmentId", "level", "sequence", ...commonStatusFilter], createFields: [createText("name", "岗位名称", true), createText("code", "岗位编码", true), createText("level", "职级"), createText("grade", "职等"), createText("sequence", "岗位序列"), { name: "headcountBudget", label: "编制人数", type: "number" }] },
  "organization-cost-centers": { title: "成本中心", description: "成本中心编码、负责人、预算、关联组织和状态管理。", model: "costCenter", apiPath: "/api/cost-centers", columns: ["name", "code", "ownerEmployeeId", "budget", "status", "updatedAt"], createTitle: "新建成本中心", createPermission: "organization.manage", exportPermission: "organization.export", deletePermission: "organization.manage", filterFields: ["ownerEmployeeId", ...commonStatusFilter], createFields: [createText("name", "成本中心名称", true), createText("code", "成本中心编码", true), { name: "budget", label: "年度预算", type: "number" }] },
  onboarding: { title: "入职管理", description: "预入职、资料收集、任务分派、合同草稿和账号开通闭环。", model: "onboardingTask", apiPath: "/api/onboarding", columns: ["title", "employeeId", "assigneeUserId", "dueDate", "completedAt", "status"], createTitle: "新建入职任务", createPermission: "onboarding.manage", exportPermission: "onboarding.export", filterFields: ["employeeId", "assigneeUserId", ...commonStatusFilter], dateField: "dueDate", createFields: [createText("title", "任务名称", true), createText("description", "任务说明"), { name: "dueDate", label: "截止日期", type: "date" }] },
  lifecycle: { title: "员工生命周期", description: "转正、调岗、调薪、离职等员工状态流转和审批记录。", model: "employeeChange", apiPath: "/api/lifecycle/changes", columns: ["changeType", "employeeId", "effectiveDate", "reason", "createdById", "createdAt"], createTitle: "新建员工变动", createPermission: "lifecycle.manage", exportPermission: "lifecycle.export", filterFields: ["employeeId", "changeType"], dateField: "effectiveDate", createFields: [createText("changeType", "变动类型", true), { name: "effectiveDate", label: "生效日期", type: "date", required: true }, createText("reason", "变动原因")] },
  contracts: { title: "合同中心", description: "合同台账、模板、续签、终止、附件权限和到期预警。", model: "employeeContract", apiPath: "/api/contracts", columns: ["contractNo", "employeeId", "contractType", "startDate", "endDate", "signDate", "renewalReminderDays", "status"], createTitle: "新建合同", createPermission: "contracts.create", exportPermission: "contracts.export", deletePermission: "contracts.terminate", filterFields: ["employeeId", "contractType", ...commonStatusFilter], dateField: "endDate", createFields: [createText("contractNo", "合同编号"), createText("contractType", "合同类型", true), { name: "startDate", label: "开始日期", type: "date", required: true }, { name: "endDate", label: "结束日期", type: "date" }, { name: "signDate", label: "签署日期", type: "date" }] },
  "contracts-templates": { title: "合同模板", description: "合同模板、变量字段、版本和启停状态。", model: "contractTemplate", apiPath: "/api/contracts/templates", columns: ["name", "contractType", "status", "createdAt", "updatedAt"], createTitle: "新建合同模板", createPermission: "contracts.create", exportPermission: "contracts.export", deletePermission: "contracts.update", filterFields: ["contractType", ...commonStatusFilter], createFields: [createText("name", "模板名称", true), createText("contractType", "合同类型", true), createText("content", "模板内容", true)] },
  attendance: { title: "考勤管理", description: "打卡记录、日考勤、月考勤、班次排班和异常统计。", model: "clockRecord", apiPath: "/api/attendance/clock-records", columns: ["employeeId", "clockTime", "clockType", "source", "location", "status", "createdAt"], createTitle: "新建打卡记录", createPermission: "attendance.manage", exportPermission: "attendance.export", filterFields: ["employeeId", "clockType", "source", ...commonStatusFilter], dateField: "clockTime", createFields: [{ name: "clockTime", label: "打卡时间", type: "datetime-local", required: true }, createText("clockType", "打卡类型", true), createText("source", "来源"), createText("location", "地点")] },
  "attendance-shifts": { title: "班次管理", description: "班次时间、休息时长、跨天和状态。", model: "shift", apiPath: "/api/attendance/shifts", columns: ["name", "startTime", "endTime", "breakMinutes", "crossDay", "color", "status"], createTitle: "新建班次", createPermission: "attendance.manage", exportPermission: "attendance.export", deletePermission: "attendance.manage", filterFields: commonStatusFilter, createFields: [createText("name", "班次名称", true), createText("startTime", "上班时间", true), createText("endTime", "下班时间", true), { name: "breakMinutes", label: "休息分钟", type: "number" }, createText("color", "颜色")] },
  "attendance-schedules": { title: "排班管理", description: "员工、日期、班次和排班状态。", model: "schedule", apiPath: "/api/attendance/schedules", columns: ["employeeId", "date", "shiftId", "status", "updatedAt"], createTitle: "新建排班", createPermission: "attendance.manage", exportPermission: "attendance.export", deletePermission: "attendance.manage", filterFields: ["employeeId", "shiftId", ...commonStatusFilter], dateField: "date", createFields: [{ name: "date", label: "排班日期", type: "date", required: true }, createText("status", "排班状态")] },
  "attendance-monthly": { title: "月考勤", description: "月度出勤、迟到、早退、缺卡、请假和加班统计。", model: "attendanceMonthly", apiPath: "/api/attendance/monthly", columns: ["employeeId", "year", "month", "normalDays", "lateCount", "earlyLeaveCount", "missingPunchCount", "absentDays", "leaveHours", "overtimeHours"], exportPermission: "attendance.export", filterFields: ["employeeId", "year", "month"] },
  leave: { title: "请假申请", description: "请假、加班、补卡、调休和假期余额审批流程。", model: "leaveRequest", apiPath: "/api/leave/requests", columns: ["employeeId", "leaveTypeId", "startAt", "endAt", "durationHours", "reason", "status"], createTitle: "新建请假", createPermission: "leave.apply", exportPermission: "leave.export", deletePermission: "leave.manage", filterFields: ["employeeId", "leaveTypeId", ...commonStatusFilter], dateField: "startAt", createFields: [{ name: "startAt", label: "开始时间", type: "datetime-local", required: true }, { name: "endAt", label: "结束时间", type: "datetime-local", required: true }, { name: "durationHours", label: "请假时长", type: "number" }, createText("reason", "请假原因")] },
  "leave-overtime": { title: "加班申请", description: "加班时段、补偿方式、原因和审批状态。", model: "overtimeRequest", apiPath: "/api/leave/overtime", columns: ["employeeId", "startAt", "endAt", "durationHours", "compensationType", "reason", "status"], createTitle: "新建加班", createPermission: "leave.apply", exportPermission: "leave.export", deletePermission: "leave.manage", filterFields: ["employeeId", "compensationType", ...commonStatusFilter], dateField: "startAt", createFields: [{ name: "startAt", label: "开始时间", type: "datetime-local", required: true }, { name: "endAt", label: "结束时间", type: "datetime-local", required: true }, { name: "durationHours", label: "加班时长", type: "number" }, createText("compensationType", "补偿方式"), createText("reason", "加班原因")] },
  "leave-punch-corrections": { title: "补卡申请", description: "补卡日期、时间、打卡类型、原因和审批状态。", model: "punchCorrection", apiPath: "/api/leave/punch-corrections", columns: ["employeeId", "date", "correctionTime", "clockType", "reason", "status"], createTitle: "新建补卡", createPermission: "leave.apply", exportPermission: "leave.export", deletePermission: "leave.manage", filterFields: ["employeeId", "clockType", ...commonStatusFilter], dateField: "date", createFields: [{ name: "date", label: "补卡日期", type: "date", required: true }, { name: "correctionTime", label: "补卡时间", type: "datetime-local", required: true }, createText("clockType", "打卡类型"), createText("reason", "补卡原因")] },
  "leave-balances": { title: "假期余额", description: "员工假期年度额度、已用、剩余和单位。", model: "leaveBalance", apiPath: "/api/leave/balances", columns: ["employeeId", "leaveTypeId", "year", "totalHours", "usedHours", "remainingHours", "updatedAt"], exportPermission: "leave.export", filterFields: ["employeeId", "leaveTypeId", "year"] },
  payroll: { title: "薪资批次", description: "薪资项目、薪资结构、薪资批次、成本汇总和工资条发布。", model: "salaryBatch", apiPath: "/api/payroll/batches", columns: ["name", "year", "month", "status", "totalGross", "totalDeductions", "totalNet", "totalCompanyCost"], createTitle: "新建薪资批次", createPermission: "payroll.manage", exportPermission: "payroll.export", deletePermission: "payroll.manage", filterFields: ["year", "month", ...commonStatusFilter], createFields: [createText("name", "批次名称", true), { name: "year", label: "年度", type: "number", required: true }, { name: "month", label: "月份", type: "number", required: true }] },
  "payroll-items": { title: "薪资项目", description: "应发、扣款、公司成本、计税和公式配置。", model: "salaryItem", apiPath: "/api/payroll/items", columns: ["name", "code", "type", "taxable", "formula", "status"], createTitle: "新建薪资项目", createPermission: "payroll.manage", exportPermission: "payroll.export", deletePermission: "payroll.manage", filterFields: ["type", ...commonStatusFilter], createFields: [createText("name", "项目名称", true), createText("code", "项目编码", true), createText("type", "项目类型", true), createText("formula", "公式")] },
  "payroll-structures": { title: "薪资结构", description: "结构名称、适用范围、项目列表和状态。", model: "salaryStructure", apiPath: "/api/payroll/structures", columns: ["name", "description", "items", "status", "updatedAt"], createTitle: "新建薪资结构", createPermission: "payroll.manage", exportPermission: "payroll.export", deletePermission: "payroll.manage", filterFields: commonStatusFilter, createFields: [createText("name", "结构名称", true), createText("items", "项目编码列表"), createText("description", "描述")] },
  payslips: { title: "工资条", description: "员工本人可查看并确认工资条，薪资敏感访问全量审计。", model: "payslip", apiPath: "/api/payslips", columns: ["employeeId", "salaryRecordId", "publishedAt", "confirmedAt", "status"], filterFields: ["employeeId", ...commonStatusFilter] },
  "social-security": { title: "社保公积金", description: "城市规则、缴费基数、公司/个人比例和参保台账。", model: "employeeSocialSecurity", apiPath: "/api/social-security/employees", columns: ["employeeId", "city", "base", "startMonth", "endMonth", "status"], createTitle: "新建参保记录", createPermission: "social_security.manage", exportPermission: "social_security.export", filterFields: ["employeeId", "city", ...commonStatusFilter], createFields: [createText("city", "参保城市", true), { name: "base", label: "社保基数", type: "number", required: true }, createText("startMonth", "起始月份")] },
  workflows: { title: "流程配置", description: "审批流程模板、业务类型、节点数量和适用范围。", model: "workflowTemplate", apiPath: "/api/workflows/templates", columns: ["name", "code", "businessType", "description", "status", "updatedAt"], createTitle: "新建流程模板", createPermission: "workflows.manage", exportPermission: "workflows.export", deletePermission: "workflows.manage", filterFields: ["businessType", ...commonStatusFilter], createFields: [createText("name", "流程名称", true), createText("code", "流程编码", true), createText("businessType", "业务类型", true), createText("description", "说明")] },
  approvals: { title: "审批中心", description: "审批任务、当前节点、审批人、状态和时间线。", model: "workflowTask", apiPath: "/api/approvals/tasks", columns: ["instanceId", "approverId", "status", "comment", "approvedAt", "createdAt"], exportPermission: "approvals.export", filterFields: ["approverId", ...commonStatusFilter] },
  recruitment: { title: "招聘候选人", description: "招聘需求、职位、候选人、面试与 Offer 基础版。", model: "candidate", apiPath: "/api/recruitment/candidates", columns: ["name", "phone", "email", "source", "targetPositionId", "status", "resumeUrl"], createTitle: "新建候选人", createPermission: "recruitment.manage", exportPermission: "recruitment.export", deletePermission: "recruitment.manage", filterFields: ["source", "targetPositionId", ...commonStatusFilter], createFields: [createText("name", "候选人姓名", true), createText("phone", "手机"), { name: "email", label: "邮箱", type: "email" }, createText("source", "来源"), createText("resumeUrl", "简历 URL")] },
  "recruitment-requests": { title: "招聘需求", description: "需求部门、岗位、人数、优先级、期望到岗和审批状态。", model: "recruitmentRequest", apiPath: "/api/recruitment/requests", columns: ["departmentId", "positionId", "headcount", "reason", "priority", "expectedStartDate", "status"], createTitle: "新建招聘需求", createPermission: "recruitment.manage", exportPermission: "recruitment.export", filterFields: ["departmentId", "positionId", "priority", ...commonStatusFilter], dateField: "expectedStartDate", createFields: [{ name: "headcount", label: "招聘人数", type: "number", required: true }, createText("reason", "需求原因"), createText("priority", "优先级"), { name: "expectedStartDate", label: "期望到岗日期", type: "date" }] },
  "recruitment-jobs": { title: "招聘职位", description: "职位名称、地点、薪资范围、描述、要求和发布状态。", model: "jobPosting", apiPath: "/api/recruitment/jobs", columns: ["title", "location", "salaryMin", "salaryMax", "status", "publishedAt"], createTitle: "新建职位", createPermission: "recruitment.manage", exportPermission: "recruitment.export", filterFields: commonStatusFilter, dateField: "publishedAt", createFields: [createText("title", "职位名称", true), createText("location", "工作地点"), { name: "salaryMin", label: "薪资下限", type: "number" }, { name: "salaryMax", label: "薪资上限", type: "number" }, createText("description", "职位描述"), createText("requirements", "任职要求")] },
  performance: { title: "绩效评价", description: "绩效周期、目标、自评、上级评价、分数和等级分布。", model: "performanceReview", apiPath: "/api/performance/reviews", columns: ["cycleId", "employeeId", "reviewerId", "score", "grade", "comments", "status"], createTitle: "新建绩效评价", createPermission: "performance.review", exportPermission: "performance.export", filterFields: ["cycleId", "employeeId", "reviewerId", "grade", ...commonStatusFilter], createFields: [{ name: "score", label: "分数", type: "number" }, createText("grade", "等级"), createText("selfReview", "自评"), createText("managerReview", "上级评价"), createText("comments", "评语")] },
  "performance-cycles": { title: "绩效周期", description: "周期类型、起止日期、适用部门和状态。", model: "performanceCycle", apiPath: "/api/performance/cycles", columns: ["name", "type", "startDate", "endDate", "status"], createTitle: "新建绩效周期", createPermission: "performance.manage", exportPermission: "performance.export", filterFields: ["type", ...commonStatusFilter], dateField: "startDate", createFields: [createText("name", "周期名称", true), createText("type", "周期类型", true), { name: "startDate", label: "开始日期", type: "date", required: true }, { name: "endDate", label: "结束日期", type: "date", required: true }] },
  training: { title: "培训任务", description: "课程库、培训任务、学习状态、完成率和证书记录。", model: "trainingTask", apiPath: "/api/training/tasks", columns: ["courseId", "employeeId", "assignedAt", "dueAt", "completedAt", "status", "score"], createTitle: "新建培训任务", createPermission: "training.manage", exportPermission: "training.export", filterFields: ["courseId", "employeeId", ...commonStatusFilter], dateField: "dueAt", createFields: [{ name: "dueAt", label: "截止时间", type: "datetime-local" }, { name: "score", label: "得分", type: "number" }] },
  "training-courses": { title: "课程管理", description: "课程类型、简介、内容 URL、课时和状态。", model: "course", apiPath: "/api/training/courses", columns: ["title", "courseType", "durationMinutes", "contentUrl", "status"], createTitle: "新建课程", createPermission: "training.manage", exportPermission: "training.export", filterFields: ["courseType", ...commonStatusFilter], createFields: [createText("title", "课程名称", true), createText("courseType", "课程类型", true), createText("description", "课程简介"), { name: "contentUrl", label: "内容 URL", type: "url" }, { name: "durationMinutes", label: "课时分钟", type: "number" }] },
  notifications: { title: "通知中心", description: "系统通知、审批通知、合同到期、薪资、培训和绩效通知。", model: "notification", apiPath: "/api/notifications", columns: ["title", "type", "userId", "status", "createdAt", "readAt"], createTitle: "新建通知", createPermission: "notifications.manage", exportPermission: "notifications.export", filterFields: ["type", "userId", ...commonStatusFilter], dateField: "createdAt", createFields: [createText("title", "标题", true), createText("content", "内容", true), createText("type", "类型", true), createText("link", "链接")] },
  files: { title: "文件中心", description: "文件列表、所属对象、可见范围、上传人和下载权限。", model: "fileAsset", apiPath: "/api/files", columns: ["fileName", "mimeType", "fileSize", "ownerType", "ownerId", "visibility", "uploadedById", "createdAt"], createTitle: "新增文件元数据", createPermission: "files.upload", exportPermission: "files.export", filterFields: ["ownerType", "visibility", "uploadedById"], dateField: "createdAt", createFields: [createText("fileName", "文件名", true), { name: "fileUrl", label: "文件 URL", type: "url", required: true }, createText("mimeType", "文件类型"), { name: "fileSize", label: "文件大小", type: "number" }, createText("ownerType", "所属对象类型"), createText("visibility", "可见范围")] },
  settings: { title: "系统设置", description: "企业配置、角色权限、字段权限、字典、通知和安全设置。", model: "role", apiPath: "/api/roles", columns: ["name", "code", "description", "isSystem", "createdAt"], createTitle: "新建角色", createPermission: "roles.manage", exportPermission: "exports.manage", filterFields: ["code"], createFields: [createText("name", "角色名称", true), createText("code", "角色编码", true), createText("description", "描述")] },
  "audit-logs": { title: "审计日志", description: "操作人、模块、动作、对象、IP、UserAgent 和敏感操作审计。", model: "auditLog", apiPath: "/api/audit-logs", columns: ["actorUserId", "module", "action", "targetType", "targetId", "ip", "userAgent", "createdAt"], exportPermission: "audit_logs.export", filterFields: ["actorUserId", "module", "action"], dateField: "createdAt" },
};

export function serializeRows(rows: Record<string, unknown>[]) {
  return JSON.parse(JSON.stringify(rows)) as Record<string, unknown>[];
}

export async function getDashboardData(user: AuthUser) {
  const tenantId = user.tenantId;
  if (!tenantId) {
    const [tenantCount, userCount, auditCount] = await Promise.all([prisma.tenant.count(), prisma.user.count(), prisma.auditLog.count({ where: { tenantId: null } })]);
    return {
      stats: [
        { title: "租户总数", value: tenantCount },
        { title: "用户总数", value: userCount },
        { title: "平台审计", value: auditCount },
        { title: "交付状态", value: "内部部署" },
      ],
      departmentDistribution: [],
      trend: [],
      tasks: [],
      changes: [],
    };
  }
  const [headcount, onboarded, terminated, approvals, expiringContracts, attendanceIssues, payroll] =
    await Promise.all([
      prisma.employee.count({ where: { tenantId } }),
      prisma.employee.count({ where: { tenantId, hireDate: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } } }),
      prisma.employee.count({ where: { tenantId, employmentStatus: "TERMINATED" } }),
      prisma.workflowTask.count({ where: { tenantId, status: "PENDING" } }),
      prisma.employeeContract.count({ where: { tenantId, status: "EXPIRING" } }),
      prisma.attendanceDaily.count({ where: { tenantId, status: { not: "NORMAL" } } }),
      prisma.salaryBatch.aggregate({ where: { tenantId }, _sum: { totalCompanyCost: true } }),
    ]);
  const departments = await prisma.department.findMany({
    where: { tenantId },
    include: { _count: { select: { employees: true } } },
    orderBy: { code: "asc" },
    take: 10,
  });
  const changes = await prisma.employeeChange.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" }, take: 8 });
  const tasks = await prisma.workflowTask.findMany({ where: { tenantId, status: "PENDING" }, orderBy: { createdAt: "desc" }, take: 8 });
  return {
    stats: [
      { title: "在职人数", value: headcount },
      { title: "本月入职", value: onboarded },
      { title: "已离职", value: terminated },
      { title: "待审批", value: approvals },
      { title: "合同即将到期", value: expiringContracts },
      { title: "考勤异常", value: attendanceIssues },
      { title: "本月薪资成本", value: formatCurrency(Number(payroll._sum.totalCompanyCost ?? 0)) },
      { title: "组织覆盖", value: departments.length },
    ],
    departmentDistribution: departments.map((department) => ({ name: department.name, value: department._count.employees })),
    trend: Array.from({ length: 6 }, (_, index) => ({ month: `${index + 1}月`, headcount: Math.max(headcount - 20 + index * 4, 0), cost: 200000 + index * 30000 })),
    tasks: serializeRows(tasks),
    changes: serializeRows(changes),
  };
}

export async function getModuleRows(user: AuthUser, moduleKey: string, params: Record<string, string | string[] | undefined> = {}) {
  const config = moduleConfig[moduleKey];
  if (!config?.model) return { rows: [], total: 0 };
  const delegate = delegates[config.model];
  const tenantId = user.tenantId;
  const value = (key: string) => {
    const raw = params[key];
    return Array.isArray(raw) ? raw[0] : raw;
  };
  const where: Record<string, unknown> = tenantId ? { tenantId } : {};
  const search = value("search") ?? value("q");
  if (search && config.columns.length) {
    where.OR = config.columns
      .filter((column) => !column.endsWith("Id") && !["createdAt", "updatedAt", "startAt", "endAt", "date"].includes(column))
      .slice(0, 4)
      .map((field) => ({ [field]: { contains: search, mode: "insensitive" } }));
  }
  const status = value("status");
  if (status) where[config.statusField ?? "status"] = status;
  for (const field of config.filterFields ?? []) {
    const fieldValue = value(field);
    if (fieldValue) where[field] = ["year", "month"].includes(field) ? Number(fieldValue) : fieldValue;
  }
  const startDate = value("startDate");
  const endDate = value("endDate");
  if (config.dateField && (startDate || endDate)) {
    where[config.dateField] = {
      ...(startDate ? { gte: new Date(startDate) } : {}),
      ...(endDate ? { lte: new Date(endDate) } : {}),
    };
  }
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
