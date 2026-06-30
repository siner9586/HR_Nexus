import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { DataTable } from "@/components/shared/data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function PlatformPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.roles.includes("PLATFORM_ADMIN")) redirect("/dashboard");
  const [tenantCount, activeTenants, userCount, employeeCount, tenants, auditCount] = await Promise.all([
    prisma.tenant.count(),
    prisma.tenant.count({ where: { status: "ACTIVE" } }),
    prisma.user.count(),
    prisma.employee.count(),
    prisma.tenant.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.auditLog.count({ where: { tenantId: null } }),
  ]);
  return (
    <AppShell>
      <PageHeader title="平台管理" description="平台超管查看租户、用户、员工规模和平台审计，不默认进入租户员工敏感数据。" />
      <div className="space-y-5 p-4 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title="租户总数" value={tenantCount} />
          <StatCard title="活跃租户" value={activeTenants} />
          <StatCard title="用户总数" value={userCount} />
          <StatCard title="员工档案" value={employeeCount} />
          <StatCard title="平台审计" value={auditCount} />
        </div>
        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>最近开通企业</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable columns={[{ key: "name", header: "租户" }, { key: "slug", header: "Slug" }, { key: "industry", header: "行业" }, { key: "companySize", header: "规模" }, { key: "status", header: "状态" }, { key: "createdAt", header: "创建时间" }]} rows={JSON.parse(JSON.stringify(tenants))} />
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
