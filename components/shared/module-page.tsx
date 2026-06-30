import { redirect } from "next/navigation";
import Link from "next/link";
import { Download, Filter, RefreshCw, RotateCcw } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { DataTable } from "@/components/shared/data-table";
import { CreateEntityDialog } from "@/components/shared/create-entity-dialog";
import { RowActions } from "@/components/shared/row-actions";
import { getCurrentUser } from "@/lib/auth";
import { displayValue, getModuleRows, moduleConfig } from "@/lib/page-data";
import { hasPermission } from "@/lib/permissions";

type SearchParams = Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;

const viewPermissions: Record<string, string> = {
  organization: "organization.view",
  "organization-positions": "organization.view",
  "organization-cost-centers": "organization.view",
  onboarding: "onboarding.view",
  lifecycle: "lifecycle.view",
  contracts: "contracts.view",
  "contracts-templates": "contracts.view",
  attendance: "attendance.view",
  "attendance-shifts": "attendance.view",
  "attendance-schedules": "attendance.view",
  "attendance-monthly": "attendance.view",
  leave: "leave.view",
  "leave-overtime": "leave.view",
  "leave-punch-corrections": "leave.view",
  "leave-balances": "leave.view",
  payroll: "payroll.view",
  "payroll-items": "payroll.view",
  "payroll-structures": "payroll.view",
  payslips: "payslips.view_self",
  "social-security": "social_security.view",
  workflows: "workflows.view",
  approvals: "approvals.view",
  recruitment: "recruitment.view",
  "recruitment-requests": "recruitment.view",
  "recruitment-jobs": "recruitment.view",
  performance: "performance.view",
  "performance-cycles": "performance.view",
  training: "training.view",
  "training-courses": "training.view",
  notifications: "notifications.view",
  files: "files.view",
  settings: "settings.view",
  "audit-logs": "audit_logs.view",
};

function param(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export async function ModulePage({ moduleKey, searchParams }: { moduleKey: string; searchParams?: SearchParams }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const config = moduleConfig[moduleKey] ?? {
    title: moduleKey,
    description: "HR Nexus 模块基础页。",
    columns: ["id", "createdAt", "status"],
  };
  const viewPermission = viewPermissions[moduleKey];
  if (viewPermission && !hasPermission(user, viewPermission as never)) redirect("/dashboard");
  const params = searchParams ? await searchParams : {};
  const { rows, total } = await getModuleRows(user, moduleKey, params);
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    const normalized = Array.isArray(value) ? value[0] : value;
    if (normalized) query.set(key, normalized);
  }
  const exportHref = config.apiPath ? `${config.apiPath}/export${query.toString() ? `?${query}` : ""}` : undefined;
  const canCreate = config.createPermission ? hasPermission(user, config.createPermission as never) : Boolean(config.createFields?.length);
  const canExport = config.exportPermission ? hasPermission(user, config.exportPermission as never) : Boolean(config.apiPath);
  const canDelete = config.deletePermission ? hasPermission(user, config.deletePermission as never) : false;
  const detailBasePath = moduleKey === "contracts" ? "/contracts" : undefined;
  const columns = config.columns.map((column) => ({
    key: column,
    header: column,
    render: (row: Record<string, unknown>) => displayValue(row[column]),
  }));
  const tableColumns = [
    ...columns,
    {
      key: "actions",
      header: "操作",
      render: (row: Record<string, unknown>) => (
        <RowActions
          href={detailBasePath && String(row.id ?? "") ? `${detailBasePath}/${String(row.id)}` : undefined}
          deleteEndpoint={canDelete && config.apiPath && row.id ? `${config.apiPath}/${String(row.id)}` : undefined}
          actionLabel={moduleKey === "contracts" ? "作废" : "归档"}
        />
      ),
    },
  ];

  return (
    <AppShell>
      <PageHeader
        title={config.title}
        description={config.description}
        actions={
          <>
            {canExport && exportHref ? (
              <a href={exportHref}>
                <Button variant="secondary">
                  <Download className="h-4 w-4" />
                  导出
                </Button>
              </a>
            ) : null}
            <Link href={config.apiPath?.replace("/api", "") || "/"}>
              <Button variant="secondary">
                <RefreshCw className="h-4 w-4" />
                刷新
              </Button>
            </Link>
            {canCreate && config.apiPath && config.createFields?.length ? <CreateEntityDialog title={config.createTitle ?? `新建${config.title}`} endpoint={config.apiPath} fields={config.createFields} /> : null}
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
          <CardContent>
            <form className="grid gap-3 md:grid-cols-5">
              <Input name="search" defaultValue={param(params, "search") ?? ""} placeholder="搜索名称、编号、状态或关键词" />
              <Input name="status" defaultValue={param(params, "status") ?? ""} placeholder="状态" />
              <Input name="departmentId" defaultValue={param(params, "departmentId") ?? ""} placeholder="部门 ID" />
              <Input name="startDate" defaultValue={param(params, "startDate") ?? ""} type="date" />
              <Input name="endDate" defaultValue={param(params, "endDate") ?? ""} type="date" />
              <div className="flex gap-2 md:col-span-5">
                <Button type="submit">
                  <Filter className="h-4 w-4" />
                  筛选
                </Button>
                <Link href={config.apiPath?.replace("/api", "") || "/"}>
                  <Button type="button" variant="secondary">
                    <RotateCcw className="h-4 w-4" />
                    重置
                  </Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
        <DataTable columns={tableColumns} rows={rows} emptyText="暂无数据，请调整筛选条件或新建记录" />
        <div className="rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          当前显示 {rows.length} 条，共 {total} 条。分页参数可通过 API 的 page/pageSize 使用，列表页默认展示最近 20 条。
        </div>
      </div>
    </AppShell>
  );
}
