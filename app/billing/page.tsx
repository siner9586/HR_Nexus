import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { BillingActions, BillingPortalButton } from "@/components/billing/billing-actions";
import { BillingPlanCard } from "@/components/billing/billing-plan-card";
import { UsageMeter } from "@/components/billing/usage-meter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageHeader } from "@/components/shared/page-header";
import { getCurrentUser } from "@/lib/auth";
import { getBillingOverview } from "@/lib/billing";
import { prisma } from "@/lib/db";
import { formatCurrency, formatDate } from "@/lib/format";

export default async function BillingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.tenantId) redirect("/platform");
  const overview = await getBillingOverview(user.tenantId);
  const plans = await prisma.plan.findMany({ orderBy: { sortOrder: "asc" } });
  if (!overview) redirect("/dashboard");
  return (
    <AppShell>
      <PageHeader title="计费与套餐" description="查看当前套餐、员工用量、存储用量、AI credits、订阅状态、Checkout 和客户门户。" actions={<BillingPortalButton />} />
      <div className="space-y-5 p-4 sm:p-6">
        {overview.mockMode ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            当前处于 mock billing mode。配置 STRIPE_SECRET_KEY 与 STRIPE_WEBHOOK_SECRET 后可切换到 Stripe test/live mode。
          </div>
        ) : null}
        <div className="grid gap-4 xl:grid-cols-3">
          <Card>
            <CardHeader><CardTitle>当前套餐</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="text-3xl font-bold">{overview.plan?.name ?? overview.tenant.plan}</div>
              <StatusBadge status={overview.subscription?.status ?? "MOCK"} />
              <p className="text-sm text-slate-600">当前周期：{formatDate(overview.subscription?.currentPeriodStart)} - {formatDate(overview.subscription?.currentPeriodEnd)}</p>
              <p className="text-sm text-slate-600">金额：{formatCurrency(Number(overview.subscription?.amount ?? 0))}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>员工用量</CardTitle></CardHeader>
            <CardContent>
              <UsageMeter value={overview.usage.employees} max={overview.usage.maxEmployees} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>存储与 AI</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <UsageMeter value={overview.usage.storageGB} max={overview.usage.maxStorageGB} />
              <p className="text-sm text-slate-600">AI credits：{overview.usage.aiCredits}</p>
            </CardContent>
          </Card>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {plans.map((plan) => (
            <div key={plan.id} className="space-y-3">
              <BillingPlanCard name={plan.name} price={Number(plan.priceMonthly)} features={Array.isArray(plan.features) ? (plan.features as string[]) : []} current={plan.code === overview.tenant.plan} />
              {["STANDARD", "PROFESSIONAL", "ENTERPRISE"].includes(plan.code) ? <BillingActions planCode={plan.code as "STANDARD" | "PROFESSIONAL" | "ENTERPRISE"} /> : null}
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
