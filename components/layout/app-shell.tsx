import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import {
  Bell,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  ChartNoAxesCombined,
  CheckSquare,
  CreditCard,
  FileArchive,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LockKeyhole,
  Search,
  Settings,
  ShieldCheck,
  Users,
  WalletCards,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasPermission, isPlatformAdmin, type AuthUser } from "@/lib/permissions";

type NavItem = {
  href: string;
  label: string;
  permission?: Parameters<typeof hasPermission>[1];
  icon: ComponentType<{ className?: string }>;
  platformOnly?: boolean;
};

const nav: NavItem[] = [
  { href: "/dashboard", label: "工作台", permission: "dashboard.view", icon: LayoutDashboard },
  { href: "/employees", label: "员工档案", permission: "employees.view", icon: Users },
  { href: "/organization", label: "组织架构", permission: "organization.view", icon: Building2 },
  { href: "/onboarding", label: "入职管理", permission: "onboarding.view", icon: BriefcaseBusiness },
  { href: "/lifecycle", label: "员工生命周期", permission: "lifecycle.view", icon: CalendarClock },
  { href: "/contracts", label: "合同中心", permission: "contracts.view", icon: FileText },
  { href: "/attendance", label: "考勤管理", permission: "attendance.view", icon: CalendarClock },
  { href: "/leave", label: "请假加班", permission: "leave.view", icon: CheckSquare },
  { href: "/payroll", label: "薪资管理", permission: "payroll.view", icon: WalletCards },
  { href: "/payslips", label: "工资条", permission: "payslips.view_self", icon: FileText },
  { href: "/social-security", label: "社保公积金", permission: "social_security.view", icon: ShieldCheck },
  { href: "/approvals", label: "审批中心", permission: "approvals.view", icon: CheckSquare },
  { href: "/workflows", label: "流程配置", permission: "workflows.view", icon: LockKeyhole },
  { href: "/recruitment", label: "招聘管理", permission: "recruitment.view", icon: BriefcaseBusiness },
  { href: "/performance", label: "绩效管理", permission: "performance.view", icon: ChartNoAxesCombined },
  { href: "/training", label: "培训管理", permission: "training.view", icon: GraduationCap },
  { href: "/analytics", label: "数据分析", permission: "analytics.view", icon: ChartNoAxesCombined },
  { href: "/notifications", label: "通知中心", permission: "notifications.view", icon: Bell },
  { href: "/files", label: "文件中心", permission: "files.view", icon: FileArchive },
  { href: "/billing", label: "计费与套餐", permission: "billing.view", icon: CreditCard },
  { href: "/settings", label: "系统设置", permission: "settings.view", icon: Settings },
  { href: "/platform", label: "平台管理", permission: "platform.view", icon: ShieldCheck, platformOnly: true },
];

function visibleNav(user: AuthUser | null) {
  if (!user) return [];
  return nav.filter((item) => {
    if (item.platformOnly) return isPlatformAdmin(user);
    if (isPlatformAdmin(user)) return false;
    return !item.permission || hasPermission(user, item.permission);
  });
}

export async function AppShell({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  const tenant = user?.tenantId
    ? await prisma.tenant.findUnique({ where: { id: user.tenantId }, select: { name: true, plan: true, status: true } })
    : null;
  const notifications = user?.tenantId && user?.id ? await prisma.notification.count({ where: { tenantId: user.tenantId, userId: user.id, status: "UNREAD" } }) : 0;

  return (
    <div className="min-h-screen bg-slate-100">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-72 border-r border-slate-200 bg-slate-950 text-white lg:block">
        <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-600 font-semibold">HR</div>
          <div>
            <p className="font-semibold">HR Nexus</p>
            <p className="text-xs text-slate-400">Enterprise HR SaaS</p>
          </div>
        </div>
        <nav className="h-[calc(100vh-4rem)] overflow-y-auto px-3 py-4 scrollbar-thin">
          {visibleNav(user).map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className="mb-1 flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-slate-200 hover:bg-white/10">
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="lg:pl-72">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="hidden text-sm font-medium text-slate-700 sm:block">
              {tenant ? tenant.name : isPlatformAdmin(user) ? "平台管理控制台" : "HR Nexus"}
            </div>
            {tenant ? <StatusBadge status={tenant.plan} /> : null}
            <div className="relative hidden max-w-md flex-1 md:block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input className="pl-9" placeholder="搜索员工、合同、审批、文件" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/notifications" className="relative rounded-md border border-slate-200 p-2 text-slate-600 hover:bg-slate-50" aria-label="通知">
              <Bell className="h-4 w-4" />
              {notifications ? <span className="absolute -right-1 -top-1 rounded-full bg-red-600 px-1.5 text-[10px] font-semibold text-white">{notifications}</span> : null}
            </Link>
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-slate-900">{user?.name ?? "未登录"}</p>
              <p className="text-xs text-slate-500">{user?.roles.join(", ") ?? "Guest"}</p>
            </div>
          </div>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}
