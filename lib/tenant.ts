import type { TenantPlan } from "@prisma/client";
import { PLAN_LIMITS } from "./constants";
import { forbidden, planLimitExceeded } from "./errors";
import type { AuthUser } from "./permissions";

export function requireTenantAccess(user: AuthUser | null | undefined, tenantId?: string | null) {
  if (!user) throw forbidden("请先登录");
  if (user.roles.includes("PLATFORM_ADMIN")) return;
  if (!user.tenantId) throw forbidden("缺少租户上下文");
  if (tenantId && user.tenantId !== tenantId) throw forbidden("不能访问其他租户数据");
}

export function requirePlatformAccess(user: AuthUser | null | undefined) {
  if (!user?.roles.includes("PLATFORM_ADMIN")) throw forbidden("仅平台管理员可访问");
}

export function requireBillingAccess(user: AuthUser | null | undefined) {
  if (!user) throw forbidden("请先登录");
  if (
    !user.permissions.includes("billing.manage") &&
    !user.permissions.includes("billing.checkout") &&
    !user.permissions.includes("tenant.billing")
  ) {
    throw forbidden("无计费权限");
  }
}

export function assertPlanEmployeeLimit(plan: TenantPlan, employeeCount: number) {
  const limit = PLAN_LIMITS[plan]?.maxEmployees;
  if (limit !== null && employeeCount >= limit) {
    throw planLimitExceeded(`当前 ${plan} 套餐员工数上限为 ${limit}，请升级套餐后继续新增员工`);
  }
}
