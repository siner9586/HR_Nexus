import Link from "next/link";
import { ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const modules = ["员工主数据", "组织架构", "合同管理", "考勤假勤", "薪资工资条", "审批流", "招聘绩效培训", "数据看板"];

const capabilities = [
  "员工主数据统一化",
  "审批流程可配置化",
  "薪资成本可视化",
  "敏感访问审计化",
  "订阅计费后台化",
  "Vercel + Neon 可部署",
];

const deliveryPaths = [
  {
    title: "SaaS 快速上线",
    description: "适合中小企业快速完成员工、组织、合同、考勤、请假、审批与数据看板上线。",
  },
  {
    title: "专业模块增强",
    description: "适合需要薪酬、工资条、社保公积金、招聘、绩效、培训一体化管理的企业。",
  },
  {
    title: "集团与私有化交付",
    description: "适合多公司、多组织、多成本中心、权限复杂、审计要求更高的集团型企业。",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-100">
      <section className="bg-slate-950 text-white">
        <header className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-5">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-sm font-semibold shadow-lg shadow-blue-950/30">
              HR
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold leading-5">HR Nexus</span>
              <span className="block truncate text-xs text-slate-300">人力资源数字化管理平台</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm text-slate-300 md:flex">
            <a href="#capabilities" className="transition hover:text-white">
              产品能力
            </a>
            <a href="#scenarios" className="transition hover:text-white">
              适用场景
            </a>
            <a href="#security" className="transition hover:text-white">
              安全合规
            </a>
            <a href="#deployment" className="transition hover:text-white">
              部署方式
            </a>
            <a href="#demo" className="transition hover:text-white">
              预约演示
            </a>
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <Link href="/login">
              <Button size="sm" variant="secondary">
                登录
              </Button>
            </Link>
            <a href="#demo" className="hidden rounded-md border border-white/20 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-white/10 sm:inline-flex">
              预约演示
            </a>
          </div>
        </header>

        <div className="mx-auto grid max-w-7xl gap-10 px-6 pb-16 pt-10 lg:grid-cols-[1.15fr_0.85fr] lg:pb-20 lg:pt-14">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-1 text-sm text-blue-100">
              HR Nexus V1.0
            </div>
            <h1 className="max-w-4xl text-4xl font-semibold tracking-normal md:text-6xl">人力资源数字化管理平台</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              以员工主数据、组织架构、合同考勤、薪酬审批和数据看板为核心，帮助企业构建一体化、可审计、可扩展的人力资源数字化管理体系。
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#demo">
                <Button size="lg">
                  预约演示
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </a>
              <Link href="/login">
                <Button size="lg" variant="secondary">
                  登录控制台
                </Button>
              </Link>
            </div>
          </div>
          <Card id="security" className="border-white/10 bg-white/5 text-white shadow-2xl">
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

      <section id="capabilities" className="mx-auto max-w-7xl px-6 py-14">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-slate-950">围绕 HR 运营全链路的产品能力</h2>
          <p className="mt-2 max-w-3xl text-slate-600">从基础人事到审批、薪酬、审计和后台计费，支撑企业逐步建设统一的人力资源运营底座。</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {capabilities.map((value) => (
            <Card key={value}>
              <CardContent className="flex items-center gap-3 p-5">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <span className="font-medium">{value}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section id="deployment" className="mx-auto max-w-7xl px-6 pb-16">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-slate-950">灵活适配不同企业的人力资源数字化路径</h2>
          <p className="mt-2 max-w-3xl text-slate-600">公开首页不展示固定套餐价格，企业可根据组织规模、模块深度、部署方式和审计要求选择合适方案。</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {deliveryPaths.map((path) => (
            <Card key={path.title} className="h-full">
              <CardContent className="space-y-3 p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold text-slate-950">{path.title}</h3>
                <p className="leading-7 text-slate-600">{path.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section id="scenarios" className="mx-auto max-w-7xl px-6 pb-16">
        <Card className="overflow-hidden border-slate-200 bg-white">
          <CardContent className="grid gap-6 p-6 lg:grid-cols-[0.9fr_1.1fr] lg:p-8">
            <div>
              <h2 className="text-2xl font-semibold text-slate-950">适用于多组织、多角色、多流程的 HR 管理场景</h2>
              <p className="mt-3 leading-7 text-slate-600">
                面向中小企业、集团公司、连锁门店、制造服务、劳务外包、教育培训和项目制团队，统一管理人、组织、流程、权限与数据。
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {["多公司与多门店", "岗位与权限分层", "审批过程留痕", "薪资与成本看板"].map((item) => (
                <div key={item} className="rounded-lg border border-slate-200 bg-slate-50 p-4 font-medium text-slate-800">
                  {item}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section id="demo" className="mx-auto max-w-7xl px-6 pb-20">
        <div className="rounded-2xl bg-slate-950 px-6 py-10 text-white shadow-xl md:px-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold">预约演示，评估适合企业的上线路径</h2>
              <p className="mt-3 max-w-2xl leading-7 text-slate-300">
                了解员工、组织、合同、考勤、薪酬、审批、数据看板与后台 Billing 的完整协同方式。
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/login">
                <Button size="lg" variant="secondary">
                  进入系统
                </Button>
              </Link>
              <Link href="/register">
                <Button size="lg">创建企业</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
