import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/shared/data-table";
import { SensitiveValue } from "@/components/shared/sensitive-value";
import { StatusBadge } from "@/components/ui/status-badge";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.tenantId) redirect("/platform");
  const { id } = await params;
  const employee = await prisma.employee.findFirst({
    where: { id, tenantId: user.tenantId },
    include: { company: true, department: true, position: true, profile: true, contracts: true, changes: true, payslips: { include: { salaryRecord: true } } },
  });
  if (!employee) redirect("/employees");
  if (user.roles.includes("EMPLOYEE") && user.employeeId !== employee.id) redirect("/payslips");
  const canSensitive = hasPermission(user, "employees.view_sensitive");
  const canPayroll = hasPermission(user, "payroll.view_sensitive") || user.employeeId === employee.id;
  return (
    <AppShell>
      <PageHeader title={employee.name} description={`${employee.employeeNo} | ${employee.department.name} | ${employee.position.name}`} actions={<StatusBadge status={employee.employmentStatus} />} />
      <div className="space-y-5 p-4 sm:p-6">
        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader><CardTitle>基本信息</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>手机：<SensitiveValue value={employee.phone} type="phone" canView={canSensitive} /></p>
              <p>身份证：<SensitiveValue value={employee.idNumberMasked} type="idNumber" canView={canSensitive} /></p>
              <p>住址：<SensitiveValue value={employee.profile?.address} type="text" canView={canSensitive} /></p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>工作信息</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>公司：{employee.company.name}</p>
              <p>部门：{employee.department.name}</p>
              <p>岗位：{employee.position.name}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>薪资权限</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>薪资 Tab：{canPayroll ? "可查看" : "无权限查看"}</p>
              <p>字段脱敏：{canSensitive ? "完整显示" : "默认脱敏"}</p>
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader><CardTitle>合同</CardTitle></CardHeader>
          <CardContent>
            <DataTable columns={[{ key: "contractNo", header: "合同编号" }, { key: "contractType", header: "类型" }, { key: "endDate", header: "结束日期" }, { key: "status", header: "状态" }]} rows={JSON.parse(JSON.stringify(employee.contracts))} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>工资条</CardTitle></CardHeader>
          <CardContent>
            <DataTable columns={[{ key: "status", header: "状态" }, { key: "publishedAt", header: "发布时间" }, { key: "salaryRecordId", header: "记录" }]} rows={canPayroll ? JSON.parse(JSON.stringify(employee.payslips)) : []} emptyText="无权限查看工资条" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>变动记录与审计</CardTitle></CardHeader>
          <CardContent>
            <DataTable columns={[{ key: "changeType", header: "类型" }, { key: "effectiveDate", header: "生效日期" }, { key: "reason", header: "原因" }]} rows={JSON.parse(JSON.stringify(employee.changes))} />
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
