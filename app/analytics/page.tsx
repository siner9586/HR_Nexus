import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardCharts } from "@/components/dashboard/dashboard-charts";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { getCurrentUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/page-data";

export default async function AnalyticsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const data = await getDashboardData(user);
  return (
    <AppShell>
      <PageHeader title="数据分析" description="人数趋势、入离职、部门分布、人力成本、合同到期、考勤异常、绩效和套餐用量概览。" />
      <div className="space-y-5 p-4 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {data.stats.slice(0, 8).map((stat) => (
            <StatCard key={stat.title} title={stat.title} value={stat.value} />
          ))}
        </div>
        <DashboardCharts departmentDistribution={data.departmentDistribution} trend={data.trend} />
      </div>
    </AppShell>
  );
}
