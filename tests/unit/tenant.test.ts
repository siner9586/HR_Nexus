import { describe, expect, it } from "vitest";
import { requireTenantAccess } from "@/lib/tenant";

describe("tenant", () => {
  it("enforces tenant data isolation", () => {
    expect(() =>
      requireTenantAccess({
        id: "u1",
        tenantId: "t1",
        employeeId: null,
        name: "Owner",
        email: "owner@example.com",
        roles: ["TENANT_OWNER"],
        permissions: [],
      }, "t2"),
    ).toThrow(/不能访问其他租户数据/);
  });
});
