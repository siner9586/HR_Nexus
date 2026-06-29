import Link from "next/link";
import { ArrowRight, Building2, CalendarCheck, CheckCircle2, DatabaseZap, LogIn, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function HomePage() {
  const modules = ["员工主数据", "组织架构", "合同管理", "考勤假勤", "薪资工资条", "审批流", "招聘绩效培训", "数据看板"];
  const industries = ["科技互联网", "制造业", "连锁零售", "专业服务", "集团型组织", "成长型企业"];
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

  return (
    <main className="min-h-screen bg-slate-100">
      <section className="bg-slate-950 text-white">
        <div className="mx-auto max-w-7xl px-6 py-5">
          <header className="flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-white text-sm font-semibold text-slate-950">HR</div>
              <div>
                <div className="font-semibold leading-5">HR Nexus</div>
                <div className="text-xs text-slate-300">人力资源数字化管理平台</div>
              </div>
            </Link>
            <nav className="hidden items-center gap-6 text-sm text-slate-300 lg:flex">
              <a href="#capabilities" className="hover:text-white">
                产品能力
              </a>
              <a href="#scenarios" className="hover:text-white">
                适用场景
              </a>
              <a href="#security" className="hover:text-white">
                安全合规
              </a>
              <a href="#deployment" className="hover:text-white">
                部署方式
              </a>
              <a href="#demo" className="hover:text-white">
                预约演示
              </a>
            </nav>
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button size="sm" variant="secondary">
                  <LogIn className="h-4 w-4" />
                  登录
                </Button>
              </Link>
              <Link href="/demo-request" className="hidden sm:block">
                <Button size="sm">预约演示</Button>
              </Link>
            </div>
          </header>
        </div>
        <div className="mx-auto max-w-7xl px-6 pb-14 pt-8 lg:pb-16 lg:pt-12">
          <div className="max-w-4xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-1 text-sm text-blue-100">
              HR Nexus V1.0
            </div>
            <h1 className="text-4xl font-semibold tracking-normal md:text-6xl">人力资源数字化管理平台</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              以员工主数据、组织架构、合同考勤、薪酬审批和数据看板为核心，帮助企业构建一体化、可审计、可扩展的人力资源数字化管理体系。
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/demo-request">
                <Button size="lg">
                  <CalendarCheck className="h-4 w-4" />
                  预约演示
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="secondary">
                  登录控制台
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/register">
                <Button size="lg" variant="ghost" className="text-white hover:bg-white/10">
                  创建企业
                </Button>
              </Link>
            </div>
          </div>
          <div id="capabilities" className="mt-10 grid scroll-mt-8 gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
          <CardContent id="security" className="scroll-mt-8 space-y-3 p-5">
            <ShieldCheck className="h-7 w-7 text-blue-700" />
            <h2 className="text-xl font-semibold text-slate-950">安全与合规</h2>
            <p className="text-sm leading-6 text-slate-600">多租户隔离、RBAC、敏感字段脱敏、薪资访问审计、导出权限和 Stripe webhook 签名校验。</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent id="scenarios" className="scroll-mt-8 space-y-3 p-5">
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
          <CardContent id="deployment" className="scroll-mt-8 space-y-3 p-5">
            <DatabaseZap className="h-7 w-7 text-blue-700" />
            <h2 className="text-xl font-semibold text-slate-950">部署方式</h2>
            <p className="text-sm leading-6 text-slate-600">默认支持 Vercel + Neon SaaS 部署；文件存储可切换 R2/S3/MinIO；大型客户可走私有化部署。</p>
          </CardContent>
        </Card>
      </section>
      <section className="mx-auto max-w-7xl px-6 pb-16">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-slate-950">灵活适配不同企业的人力资源数字化路径</h2>
          <p className="mt-2 max-w-3xl text-slate-600">围绕上线速度、模块深度与组织复杂度组合交付路径，公开首页不展示固定价格，企业可通过预约演示了解适配方案。</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {deliveryPaths.map((path) => (
            <Card key={path.title}>
              <CardContent className="flex h-full flex-col gap-4 p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-50 text-blue-700">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-slate-950">{path.title}</h3>
                  <p className="text-sm leading-6 text-slate-600">{path.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div id="demo" className="mt-6 flex scroll-mt-8 flex-wrap gap-3">
          <Link href="/demo-request">
            <Button>
              <CalendarCheck className="h-4 w-4" />
              预约演示
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="secondary">
              进入系统
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>
    </main>
  );
}
