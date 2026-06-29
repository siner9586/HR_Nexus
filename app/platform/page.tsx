import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { DataTable } from "@/components/shared/data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatCurrency } from "@/lib/format";

export default async function PlatformPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.roles.includes("PLATFORM_ADMIN")) redirect("/dashboard");
  const [tenantCount, activeTenants, subscriptions, tenants, plans, auditCount] = await Promise.all([
    prisma.tenant.count(),
    prisma.tenant.count({ where: { status: "ACTIVE" } }),
    prisma.subscription.findMany({ include: { tenant: true, plan: true }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.tenant.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.plan.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.auditLog.count({ where: { tenantId: null } }),
  ]);
  const mrr = subscriptions.reduce((sum, item) => sum + Number(item.amount), 0);
  return (
    <AppShell>
      <PageHeader title="平台管理" description="平台超管查看租户、套餐、订阅和平台审计，不默认进入租户员工敏感数据。" />
      <div className="space-y-5 p-4 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title="租户总数" value={tenantCount} />
          <StatCard title="活跃租户" value={activeTenants} />
          <StatCard title="MRR" value={formatCurrency(mrr)} />
          <StatCard title="平台审计" value={auditCount} />
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>最近开通企业</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable columns={[{ key: "name", header: "租户" }, { key: "slug", header: "Slug" }, { key: "plan", header: "套餐" }, { key: "status", header: "状态" }]} rows={JSON.parse(JSON.stringify(tenants))} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>套餐分布</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable columns={[{ key: "name", header: "套餐" }, { key: "priceMonthly", header: "月付" }, { key: "maxEmployees", header: "员工上限" }, { key: "isPublic", header: "公开" }]} rows={JSON.parse(JSON.stringify(plans))} />
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
