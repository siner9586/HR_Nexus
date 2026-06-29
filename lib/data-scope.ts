import type { AuthUser } from "./permissions";

export type DataScopeResult = {
  scopeType: "ALL" | "COMPANY" | "DEPARTMENT_AND_CHILDREN" | "DEPARTMENT_ONLY" | "SELF" | "CUSTOM";
  employeeId?: string | null;
};

export function getDataScope(user: AuthUser, module: string): DataScopeResult {
  if (user.roles.includes("TENANT_OWNER") || user.roles.includes("TENANT_ADMIN")) {
    return { scopeType: "ALL" };
  }
  if (user.roles.includes("HR_DIRECTOR") || user.roles.includes("PAYROLL_SPECIALIST")) {
    return { scopeType: "ALL" };
  }
  if (user.roles.includes("DEPARTMENT_MANAGER")) {
    return { scopeType: "DEPARTMENT_AND_CHILDREN", employeeId: user.employeeId };
  }
  if (module === "audit" && user.roles.includes("AUDITOR")) {
    return { scopeType: "ALL" };
  }
  return { scopeType: "SELF", employeeId: user.employeeId };
}

export function applyTenantScope<T extends Record<string, unknown>>(query: T, tenantId: string | null) {
  if (!tenantId) return query;
  return { ...query, tenantId };
}
