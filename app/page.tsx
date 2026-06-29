import Link from "next/link";
import { ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { formatCurrency } from "@/lib/format";

export default async function HomePage() {
  const plans = await prisma.plan.findMany({ where: { isPublic: true }, orderBy: { sortOrder: "asc" } }).catch(() => []);
  const modules = ["员工主数据", "组织架构", "合同管理", "考勤假勤", "薪资工资条", "审批流", "招聘绩效培训", "数据看板"];
  return (
    <main className="min-h-screen bg-slate-100">
      <section className="bg-slate-950 text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-[1.15fr_0.85fr] lg:py-20">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-1 text-sm text-blue-100">
              HR Nexus V1.0
            </div>
            <h1 className="max-w-4xl text-4xl font-semibold tracking-normal md:text-6xl">
              企业级人力资源数字化管理平台
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              HR Nexus 将员工、组织、合同、考勤、薪酬、审批、权限、审计和 SaaS 订阅计费整合到一个可运行、可部署、可扩展的平台。
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/login">
                <Button size="lg">
                  登录演示
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/register">
                <Button size="lg" variant="secondary">
                  创建企业
                </Button>
              </Link>
            </div>
          </div>
          <Card className="border-white/10 bg-white/5 text-white shadow-2xl">
            <CardContent className="space-y-5 p-6">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-6 w-6 text-blue-300" />
                <div>
                  <p className="font-semibold">多租户 SaaS + 私有化部署</p>
                  <p className="text-sm text-slate-300">tenantId 隔离、RBAC、字段脱敏、敏感审计</p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {modules.map((item) => (
                  <div key={item} className="rounded-md border border-white/10 bg-white/5 p-3 text-sm">
                    {item}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
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
      <section className="mx-auto max-w-7xl px-6 pb-16">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-slate-950">版本价格</h2>
          <p className="mt-2 text-slate-600">免费版、标准版、专业版、企业版和私有化部署，支持 Stripe Checkout 和 mock billing mode。</p>
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
