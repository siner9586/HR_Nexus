import Link from "next/link";
import { redirect } from "next/navigation";
import { Download, Plus, RefreshCw } from "lucide-react";
import { ContractStatus, EmploymentStatus, EmploymentType, type Prisma } from "@prisma/client";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatCard } from "@/components/shared/stat-card";
import { EmployeeImportButton } from "@/components/employees/employee-import-button";
import { EmployeeBulkActionButton } from "@/components/employees/employee-bulk-action-button";
import { EmployeeColumnSettings } from "@/components/employees/employee-column-settings";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { maskEmployeeFields } from "@/lib/masking";
import { hasPermission } from "@/lib/permissions";

type PageProps = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

function param(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function EmployeesPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.tenantId) redirect("/platform");
  const params = (await searchParams) ?? {};
  const search = param(params, "search") ?? "";
  const companyId = param(params, "companyId") ?? "";
  const status = param(params, "status") ?? "";
  const departmentId = param(params, "departmentId") ?? "";
  const positionId = param(params, "positionId") ?? "";
  const managerId = param(params, "managerId") ?? "";
  const costCenterId = param(params, "costCenterId") ?? "";
  const employmentType = param(params, "employmentType") ?? "";
  const workLocation = param(params, "workLocation") ?? "";
  const contractStatus = param(params, "contractStatus") ?? "";
  const hireStartDate = param(params, "hireStartDate") ?? param(params, "startDate") ?? "";
  const hireEndDate = param(params, "hireEndDate") ?? param(params, "endDate") ?? "";
  const probationStartDate = param(params, "probationStartDate") ?? "";
  const probationEndDate = param(params, "probationEndDate") ?? "";
  const regularizationStartDate = param(params, "regularizationStartDate") ?? "";
  const regularizationEndDate = param(params, "regularizationEndDate") ?? "";
  const leaveStartDate = param(params, "leaveStartDate") ?? "";
  const leaveEndDate = param(params, "leaveEndDate") ?? "";
  const where: Prisma.EmployeeWhereInput = { tenantId: user.tenantId };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { employeeNo: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { idNumberMasked: { contains: search, mode: "insensitive" } },
    ];
  }
  if (Object.values(EmploymentStatus).includes(status as EmploymentStatus)) where.employmentStatus = status as EmploymentStatus;
  if (companyId) where.companyId = companyId;
  if (departmentId) where.departmentId = departmentId;
  if (positionId) where.positionId = positionId;
  if (managerId) where.managerId = managerId;
  if (costCenterId) where.costCenterId = costCenterId;
  if (Object.values(EmploymentType).includes(employmentType as EmploymentType)) where.employmentType = employmentType as EmploymentType;
  if (workLocation) where.workLocation = workLocation;
  if (Object.values(ContractStatus).includes(contractStatus as ContractStatus)) where.contracts = { some: { status: contractStatus as ContractStatus } };
  if (hireStartDate || hireEndDate) where.hireDate = { ...(hireStartDate ? { gte: new Date(hireStartDate) } : {}), ...(hireEndDate ? { lte: new Date(hireEndDate) } : {}) };
  if (probationStartDate || probationEndDate) where.probationEndDate = { ...(probationStartDate ? { gte: new Date(probationStartDate) } : {}), ...(probationEndDate ? { lte: new Date(probationEndDate) } : {}) };
  if (regularizationStartDate || regularizationEndDate) where.regularizationDate = { ...(regularizationStartDate ? { gte: new Date(regularizationStartDate) } : {}), ...(regularizationEndDate ? { lte: new Date(regularizationEndDate) } : {}) };
  if (leaveStartDate || leaveEndDate) where.leaveDate = { ...(leaveStartDate ? { gte: new Date(leaveStartDate) } : {}), ...(leaveEndDate ? { lte: new Date(leaveEndDate) } : {}) };
  const [employees, total, active, probation] = await Promise.all([
    prisma.employee.findMany({ where, include: { company: true, department: true, position: true, manager: true, costCenter: true, contracts: { orderBy: { createdAt: "desc" }, take: 1 } }, orderBy: { createdAt: "desc" }, take: 30 }),
    prisma.employee.count({ where }),
    prisma.employee.count({ where: { tenantId: user.tenantId, employmentStatus: "ACTIVE" } }),
    prisma.employee.count({ where: { tenantId: user.tenantId, employmentStatus: "PROBATION" } }),
  ]);
  const [companies, departments, positions, managers, costCenters] = await Promise.all([
    prisma.company.findMany({ where: { tenantId: user.tenantId }, orderBy: { createdAt: "asc" }, take: 100 }),
    prisma.department.findMany({ where: { tenantId: user.tenantId }, orderBy: { code: "asc" }, take: 100 }),
    prisma.position.findMany({ where: { tenantId: user.tenantId }, orderBy: { code: "asc" }, take: 100 }),
    prisma.employee.findMany({ where: { tenantId: user.tenantId, employmentStatus: { in: ["ACTIVE", "PROBATION"] } }, orderBy: { employeeNo: "asc" }, take: 200 }),
    prisma.costCenter.findMany({ where: { tenantId: user.tenantId }, orderBy: { code: "asc" }, take: 100 }),
  ]);
  const rows = employees.map((employee) => {
    const masked = maskEmployeeFields(employee, hasPermission(user, "employees.view_sensitive"));
    return {
      id: employee.id,
      selected: employee.id,
      avatar: employee.avatarUrl,
      name: masked.name,
      employeeNo: masked.employeeNo,
      phone: masked.phone,
      email: employee.email,
      company: employee.company.name,
      department: employee.department.name,
      position: employee.position.name,
      manager: employee.manager?.name ?? "-",
      employmentType: employee.employmentType,
      costCenter: employee.costCenter?.name ?? "-",
      contractStatus: employee.contracts[0]?.status ?? "-",
      probationEndDate: employee.probationEndDate?.toISOString().slice(0, 10) ?? "-",
      regularizationDate: employee.regularizationDate?.toISOString().slice(0, 10) ?? "-",
      workLocation: employee.workLocation ?? "-",
      updatedAt: employee.updatedAt.toISOString().slice(0, 10),
      hireDate: employee.hireDate.toISOString().slice(0, 10),
      status: employee.employmentStatus,
    };
  });
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    const normalized = Array.isArray(value) ? value[0] : value;
    if (normalized) query.set(key, normalized);
  }
  const exportHref = `/api/employees/export${query.toString() ? `?${query}` : ""}`;
  return (
    <AppShell>
      <PageHeader
        title="员工档案"
        description="搜索、筛选、新增、导入、导出员工主数据，敏感字段按角色脱敏。"
        actions={
          <>
            {hasPermission(user, "employees.import") ? <EmployeeImportButton /> : null}
            {hasPermission(user, "employees.export") ? (
              <a href={exportHref}>
                <Button variant="secondary">
                  <Download className="h-4 w-4" />
                  导出员工
                </Button>
              </a>
            ) : null}
            <Link href="/employees">
              <Button variant="secondary">
                <RefreshCw className="h-4 w-4" />
                刷新
              </Button>
            </Link>
            <EmployeeColumnSettings />
            <EmployeeBulkActionButton canArchive={hasPermission(user, "employees.delete")} />
            {hasPermission(user, "employees.create") ? (
              <Link href="/employees/new">
                <Button>
                  <Plus className="h-4 w-4" />
                  新建员工
                </Button>
              </Link>
            ) : null}
          </>
        }
      />
      <div className="space-y-5 p-4 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title="员工总数" value={total} />
          <StatCard title="在职" value={active} />
          <StatCard title="试用期" value={probation} />
          <StatCard title="筛选结果" value={rows.length} />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>搜索与筛选</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-3 md:grid-cols-4">
              <Input name="search" defaultValue={search} placeholder="姓名、工号、手机、邮箱、证件后四位" />
              <select name="companyId" defaultValue={companyId} className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm">
                <option value="">全部公司主体</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>{company.name}</option>
                ))}
              </select>
              <select name="departmentId" defaultValue={departmentId} className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm">
                <option value="">全部部门</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>{department.name}</option>
                ))}
              </select>
              <select name="positionId" defaultValue={positionId} className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm">
                <option value="">全部岗位</option>
                {positions.map((position) => (
                  <option key={position.id} value={position.id}>{position.name}</option>
                ))}
              </select>
              <select name="managerId" defaultValue={managerId} className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm">
                <option value="">全部直属上级</option>
                {managers.map((manager) => (
                  <option key={manager.id} value={manager.id}>{manager.name}</option>
                ))}
              </select>
              <select name="status" defaultValue={status} className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm">
                <option value="">全部状态</option>
                <option value="PRE_ONBOARDING">预入职</option>
                <option value="PROBATION">试用期</option>
                <option value="ACTIVE">在职</option>
                <option value="PENDING_TERMINATION">待离职</option>
                <option value="TERMINATED">已离职</option>
              </select>
              <select name="employmentType" defaultValue={employmentType} className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm">
                <option value="">全部用工类型</option>
                <option value="FULL_TIME">全职</option>
                <option value="PART_TIME">兼职</option>
                <option value="INTERN">实习</option>
                <option value="CONTRACTOR">外包</option>
                <option value="LABOR_DISPATCH">劳务派遣</option>
              </select>
              <Input name="workLocation" defaultValue={workLocation} placeholder="工作地点" />
              <select name="costCenterId" defaultValue={costCenterId} className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm">
                <option value="">全部成本中心</option>
                {costCenters.map((costCenter) => (
                  <option key={costCenter.id} value={costCenter.id}>{costCenter.name}</option>
                ))}
              </select>
              <select name="contractStatus" defaultValue={contractStatus} className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm">
                <option value="">全部合同状态</option>
                <option value="DRAFT">草稿</option>
                <option value="PENDING_SIGN">待签署</option>
                <option value="SIGNED">已签署</option>
                <option value="EXPIRING">即将到期</option>
                <option value="TERMINATED">已终止</option>
                <option value="ARCHIVED">已归档</option>
              </select>
              <Input name="hireStartDate" defaultValue={hireStartDate} type="date" />
              <Input name="hireEndDate" defaultValue={hireEndDate} type="date" />
              <Input name="probationStartDate" defaultValue={probationStartDate} type="date" />
              <Input name="probationEndDate" defaultValue={probationEndDate} type="date" />
              <Input name="regularizationStartDate" defaultValue={regularizationStartDate} type="date" />
              <Input name="regularizationEndDate" defaultValue={regularizationEndDate} type="date" />
              <Input name="leaveStartDate" defaultValue={leaveStartDate} type="date" />
              <Input name="leaveEndDate" defaultValue={leaveEndDate} type="date" />
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">筛选</Button>
                <Link href="/employees" className="flex-1">
                  <Button type="button" variant="secondary" className="w-full">重置</Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
        <DataTable
          columns={[
            { key: "selected", header: "选择", render: (row) => <input aria-label={`选择 ${String(row.name)}`} name="employeeIds" type="checkbox" value={String(row.id)} className="h-4 w-4 rounded border-slate-300" /> },
            { key: "avatar", header: "头像", render: (row) => <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-medium text-slate-700">{String(row.name).slice(0, 1)}</div> },
            { key: "name", header: "姓名", render: (row) => <Link className="font-medium text-blue-700" href={`/employees/${row.id}`}>{String(row.name)}</Link> },
            { key: "employeeNo", header: "工号" },
            { key: "phone", header: "手机" },
            { key: "email", header: "邮箱" },
            { key: "company", header: "公司主体" },
            { key: "department", header: "部门" },
            { key: "position", header: "岗位" },
            { key: "manager", header: "直属上级" },
            { key: "employmentType", header: "用工类型" },
            { key: "costCenter", header: "成本中心" },
            { key: "contractStatus", header: "合同状态" },
            { key: "hireDate", header: "入职日期" },
            { key: "probationEndDate", header: "试用期截止" },
            { key: "regularizationDate", header: "转正日期" },
            { key: "workLocation", header: "工作地点" },
            { key: "updatedAt", header: "最近变动" },
            { key: "status", header: "员工状态" },
            { key: "id", header: "操作", render: (row) => <Link className="text-blue-700" href={`/employees/${row.id}`}>查看</Link> },
          ]}
          rows={rows}
        />
      </div>
    </AppShell>
  );
}
