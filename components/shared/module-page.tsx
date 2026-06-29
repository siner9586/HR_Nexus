import { redirect } from "next/navigation";
import { Plus, Download, Filter } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { DataTable } from "@/components/shared/data-table";
import { getCurrentUser } from "@/lib/auth";
import { displayValue, getModuleRows, moduleConfig } from "@/lib/page-data";

export async function ModulePage({ moduleKey }: { moduleKey: string }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const config = moduleConfig[moduleKey] ?? {
    title: moduleKey,
    description: "HR Nexus 模块基础页。",
    columns: ["id", "createdAt", "status"],
  };
  const { rows, total } = await getModuleRows(user, moduleKey);
  const columns = config.columns.map((column) => ({
    key: column,
    header: column,
    render: (row: Record<string, unknown>) => displayValue(row[column]),
  }));

  return (
    <AppShell>
      <PageHeader
        title={config.title}
        description={config.description}
        actions={
          <>
            <Button variant="secondary">
              <Filter className="h-4 w-4" />
              筛选
            </Button>
            <Button variant="secondary">
              <Download className="h-4 w-4" />
              导出
            </Button>
            <Button>
              <Plus className="h-4 w-4" />
              新建
            </Button>
          </>
        }
      />
      <div className="space-y-5 p-4 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title="记录总数" value={total} />
          <StatCard title="当前角色" value={user.roles[0]} />
          <StatCard title="租户隔离" value={user.tenantId ? "已启用" : "平台级"} />
          <StatCard title="权限校验" value="API 强制" />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>搜索与筛选</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-[1fr_160px_160px]">
            <Input placeholder="搜索姓名、编号、状态或关键词" />
            <Input placeholder="状态" />
            <Input placeholder="部门/月份" />
          </CardContent>
        </Card>
        <DataTable columns={columns} rows={rows} emptyText="暂无演示数据，请先运行 npm run db:seed" />
      </div>
    </AppShell>
  );
}
