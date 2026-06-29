import type { PermissionCode, SystemRole } from "./constants";
import { ROLE_PERMISSIONS } from "./constants";
import { forbidden } from "./errors";

export type AuthUser = {
  id: string;
  tenantId: string | null;
  employeeId: string | null;
  name: string;
  email: string;
  roles: SystemRole[];
  permissions: PermissionCode[];
};

export function uniquePermissions(roles: SystemRole[]) {
  return Array.from(new Set(roles.flatMap((role) => ROLE_PERMISSIONS[role] ?? []))) as PermissionCode[];
}

export function hasRole(user: Pick<AuthUser, "roles"> | null | undefined, role: SystemRole) {
  return Boolean(user?.roles.includes(role));
}

export function hasPermission(
  user: Pick<AuthUser, "roles" | "permissions"> | null | undefined,
  permission: PermissionCode,
) {
  if (!user) return false;
  if (user.permissions.includes(permission)) return true;
  return user.roles.some((role) => ROLE_PERMISSIONS[role]?.includes(permission));
}

export function assertPermission(user: AuthUser | null | undefined, permission: PermissionCode) {
  if (!hasPermission(user, permission)) {
    throw forbidden("无权限操作");
  }
}

export function isPlatformAdmin(user: Pick<AuthUser, "roles"> | null | undefined) {
  return hasRole(user, "PLATFORM_ADMIN");
}

export function roleFromCode(code: string): SystemRole | null {
  const roles = Object.keys(ROLE_PERMISSIONS) as SystemRole[];
  return roles.includes(code as SystemRole) ? (code as SystemRole) : null;
}
