import { redirect } from "next/navigation";
import { ClipboardCheck, FileWarning, Users, WalletCards } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { DataTable } from "@/components/shared/data-table";
import { DashboardCharts } from "@/components/dashboard/dashboard-charts";
import { getCurrentUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/page-data";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.roles.includes("PLATFORM_ADMIN")) redirect("/platform");
  const data = await getDashboardData(user);
  const icons = [Users, ClipboardCheck, FileWarning, WalletCards];
  return (
    <AppShell>
      <PageHeader title="工作台" description="按角色展示人力资源运营、审批、合同、考勤、薪资和组织运行指标。" />
      <div className="space-y-5 p-4 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {data.stats.slice(0, 8).map((stat, index) => {
            const Icon = icons[index % icons.length];
            return <StatCard key={stat.title} title={stat.title} value={stat.value} icon={<Icon className="h-5 w-5" />} />;
          })}
        </div>
        <DashboardCharts departmentDistribution={data.departmentDistribution} trend={data.trend} />
        <div className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>待办事项</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable columns={[{ key: "instanceId", header: "流程" }, { key: "approverId", header: "审批人" }, { key: "status", header: "状态" }]} rows={data.tasks} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>最近员工变动</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable columns={[{ key: "changeType", header: "类型" }, { key: "employeeId", header: "员工" }, { key: "effectiveDate", header: "生效日期" }]} rows={data.changes} />
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
