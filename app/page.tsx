import Link from "next/link";
import { ArrowRight, Building2, CalendarCheck, CheckCircle2, DatabaseZap, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { formatCurrency } from "@/lib/format";
import { isDemoLoginEnabled } from "@/lib/runtime-env";

export default async function HomePage() {
  const plans = await prisma.plan.findMany({ where: { isPublic: true }, orderBy: { sortOrder: "asc" } }).catch(() => []);
  const demoLoginEnabled = isDemoLoginEnabled();
  const modules = ["员工主数据", "组织架构", "合同管理", "考勤假勤", "薪资工资条", "审批流", "招聘绩效培训", "数据看板"];
  const industries = ["科技互联网", "制造业", "连锁零售", "专业服务", "集团型组织", "成长型企业"];
  return (
    <main className="min-h-screen bg-slate-100">
      <section className="bg-slate-950 text-white">
        <div className="mx-auto max-w-7xl px-6 py-14 lg:py-16">
          <div className="max-w-4xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-1 text-sm text-blue-100">
              HR Nexus V1.0
            </div>
            <h1 className="text-4xl font-semibold tracking-normal md:text-6xl">HR Nexus：企业级人力资源数字化管理平台</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              覆盖员工档案、组织架构、合同、考勤、请假、薪资、审批、数据看板、权限审计和订阅计费，支持 SaaS 试运营与企业私有化交付。
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/demo-request">
                <Button size="lg">
                  <CalendarCheck className="h-4 w-4" />
                  预约演示
                </Button>
              </Link>
              {demoLoginEnabled ? (
                <Link href="/login">
                  <Button size="lg" variant="secondary">
                    进入演示环境
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              ) : null}
              <Link href="/register">
                <Button size="lg" variant={demoLoginEnabled ? "ghost" : "secondary"} className={demoLoginEnabled ? "text-white hover:bg-white/10" : undefined}>
                  创建企业
                </Button>
              </Link>
            </div>
          </div>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {modules.map((item) => (
              <div key={item} className="rounded-md border border-white/10 bg-white/5 p-3 text-sm text-slate-100">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid gap-4 md:grid-cols-3">
          {["员工主数据统一化", "审批流程可配置化", "薪资成本可视化", "敏感访问审计化", "Stripe 订阅商业化", "Vercel + Neon 可部署"].map((value) => (
            <Card key={value}>
              <CardContent className="flex items-center gap-3 p-5">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <span className="font-medium">{value}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
      <section className="mx-auto grid max-w-7xl gap-5 px-6 pb-14 lg:grid-cols-3">
        <Card>
          <CardContent className="space-y-3 p-5">
            <ShieldCheck className="h-7 w-7 text-blue-700" />
            <h2 className="text-xl font-semibold text-slate-950">安全与合规</h2>
            <p className="text-sm leading-6 text-slate-600">多租户隔离、RBAC、敏感字段脱敏、薪资访问审计、导出权限和 Stripe webhook 签名校验。</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-3 p-5">
            <Building2 className="h-7 w-7 text-blue-700" />
            <h2 className="text-xl font-semibold text-slate-950">适用行业</h2>
            <div className="flex flex-wrap gap-2">
              {industries.map((industry) => (
                <span key={industry} className="rounded-md bg-slate-100 px-2 py-1 text-sm text-slate-700">
                  {industry}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-3 p-5">
            <DatabaseZap className="h-7 w-7 text-blue-700" />
            <h2 className="text-xl font-semibold text-slate-950">部署方式</h2>
            <p className="text-sm leading-6 text-slate-600">默认支持 Vercel + Neon SaaS 部署；文件存储可切换 R2/S3/MinIO；大型客户可走私有化部署。</p>
          </CardContent>
        </Card>
      </section>
      <section className="mx-auto max-w-7xl px-6 pb-16">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-slate-950">版本价格</h2>
          <p className="mt-2 text-slate-600">FREE / STANDARD / PROFESSIONAL / ENTERPRISE / PRIVATE_DEPLOYMENT，支持按月/按年配置和 Stripe Checkout。</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {plans.map((plan) => (
            <Card key={plan.id}>
              <CardContent className="space-y-4 p-5">
                <div>
                  <h3 className="font-semibold text-slate-950">{plan.name}</h3>
                  <p className="mt-1 text-sm text-slate-500">{plan.description}</p>
                </div>
                <div className="text-2xl font-bold">{Number(plan.priceMonthly) ? formatCurrency(Number(plan.priceMonthly)) : "免费/联系销售"}</div>
                <div className="text-sm text-slate-600">员工上限：{plan.maxEmployees ?? "不限"}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
