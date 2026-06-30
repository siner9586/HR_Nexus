import { describe, expect, it } from "vitest";
import { buildExportFilename, recordsToCsv } from "@/lib/export";
import type { AuthUser } from "@/lib/permissions";

const user: AuthUser = {
  id: "u1",
  tenantId: "t1",
  employeeId: "e1",
  name: "HR",
  email: "hr@example.com",
  roles: ["HR_SPECIALIST"],
  permissions: ["employees.export"],
};

describe("csv exports", () => {
  it("adds BOM and Chinese headers", () => {
    const csv = recordsToCsv([{ name: "张三", phone: "13812345678" }], [
      { key: "name", header: "姓名" },
      { key: "phone", header: "手机", fieldType: "phone", sensitive: true },
    ], user);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain("姓名,手机");
  });

  it("masks sensitive export values without sensitive permission", () => {
    const csv = recordsToCsv([{ phone: "13812345678" }], [{ key: "phone", header: "手机", fieldType: "phone", sensitive: true }], user);
    expect(csv).toContain("138****5678");
  });

  it("builds deterministic export filenames", () => {
    expect(buildExportFilename("employees", new Date("2026-06-29T10:11:12+08:00"))).toMatch(/^hr-nexus-employees-\d{8}-\d{6}\.csv$/);
  });
});
