import { describe, expect, it } from "vitest";
import { hasPermission, uniquePermissions, type AuthUser } from "@/lib/permissions";

describe("permissions", () => {
  it("loads tenant owner permissions", () => {
    const permissions = uniquePermissions(["TENANT_OWNER"]);
    expect(permissions).toContain("employees.view");
    expect(permissions).toContain("employees.export");
    expect(permissions).toContain("organization.export");
  });

  it("denies employee payroll sensitive permission", () => {
    const user: AuthUser = {
      id: "u1",
      tenantId: "t1",
      employeeId: "e1",
      name: "Employee",
      email: "employee@demo.com",
      roles: ["EMPLOYEE"],
      permissions: uniquePermissions(["EMPLOYEE"]),
    };
    expect(hasPermission(user, "payslips.view_self")).toBe(true);
    expect(hasPermission(user, "payroll.view_sensitive")).toBe(false);
  });
});
