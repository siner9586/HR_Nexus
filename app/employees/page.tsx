import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatCard } from "@/components/shared/stat-card";
import { UpgradeBanner } from "@/components/billing/upgrade-banner";
import { getCurrentUser } from "@/lib/auth";
import { PLAN_LIMITS } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { maskEmployeeFields } from "@/lib/masking";
import { hasPermission } from "@/lib/permissions";

export default async function EmployeesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.tenantId) redirect("/platform");
  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: user.tenantId } });
  const [employees, total, active, probation] = await Promise.all([
    prisma.employee.findMany({ where: { tenantId: user.tenantId }, include: { department: true, position: true }, orderBy: { createdAt: "desc" }, take: 30 }),
    prisma.employee.count({ where: { tenantId: user.tenantId } }),
    prisma.employee.count({ where: { tenantId: user.tenantId, employmentStatus: "ACTIVE" } }),
    prisma.employee.count({ where: { tenantId: user.tenantId, employmentStatus: "PROBATION" } }),
  ]);
  const limit = PLAN_LIMITS[tenant.plan].maxEmployees;
  const rows = employees.map((employee) => {
    const masked = maskEmployeeFields(employee, hasPermission(user, "employees.view_sensitive"));
    return {
      id: employee.id,
      name: masked.name,
      employeeNo: masked.employeeNo,
      phone: masked.phone,
      department: employee.department.name,
      position: employee.position.name,
      employmentType: employee.employmentType,
      hireDate: employee.hireDate.toISOString().slice(0, 10),
      status: employee.employmentStatus,
    };
  });
  return (
    <AppShell>
      <PageHeader
        title="员工档案"
        description="搜索、筛选、新增、导入、导出员工主数据，敏感字段按角色脱敏。"
        actions={
          <Link href="/employees/new">
            <Button>
              <Plus className="h-4 w-4" />
              新增员工
            </Button>
          </Link>
        }
      />
      <div className="space-y-5 p-4 sm:p-6">
        {limit && total >= limit * 0.9 ? <UpgradeBanner message={`当前员工数 ${total}/${limit}，接近套餐上限。`} /> : null}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title="员工总数" value={total} />
          <StatCard title="在职" value={active} />
          <StatCard title="试用期" value={probation} />
          <StatCard title="套餐上限" value={limit ?? "不限"} />
        </div>
        <DataTable
          columns={[
            { key: "name", header: "姓名", render: (row) => <Link className="font-medium text-blue-700" href={`/employees/${row.id}`}>{String(row.name)}</Link> },
            { key: "employeeNo", header: "工号" },
            { key: "phone", header: "手机" },
            { key: "department", header: "部门" },
            { key: "position", header: "岗位" },
            { key: "employmentType", header: "用工类型" },
            { key: "hireDate", header: "入职日期" },
            { key: "status", header: "状态" },
          ]}
          rows={rows}
        />
      </div>
    </AppShell>
  );
}
