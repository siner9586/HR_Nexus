import type { ReactNode } from "react";
import type { PermissionCode } from "@/lib/constants";
import { hasPermission, type AuthUser } from "@/lib/permissions";

export function PermissionGuard({
  user,
  permission,
  children,
  fallback = null,
}: {
  user: AuthUser | null;
  permission: PermissionCode;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return hasPermission(user, permission) ? <>{children}</> : <>{fallback}</>;
}
