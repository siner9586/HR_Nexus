import { forbidden } from "./errors";
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
