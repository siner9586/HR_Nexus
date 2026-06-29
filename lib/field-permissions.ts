import type { AuthUser } from "./permissions";

export function canViewField(user: AuthUser, resource: string, field: string) {
  if (user.roles.includes("TENANT_OWNER")) return true;
  if (resource === "payroll" || field.toLowerCase().includes("salary")) {
    return user.permissions.includes("payroll.view_sensitive");
  }
  if (["idNumber", "bankAccount", "emergencyContactPhone"].includes(field)) {
    return user.permissions.includes("employees.view_sensitive");
  }
  if (field === "contractAttachment") {
    return user.permissions.includes("contracts.download_sensitive");
  }
  return true;
}

export function canEditField(user: AuthUser, resource: string, field: string) {
  if (!canViewField(user, resource, field)) return false;
  return user.roles.some((role) => ["TENANT_OWNER", "TENANT_ADMIN", "HR_DIRECTOR"].includes(role));
}
