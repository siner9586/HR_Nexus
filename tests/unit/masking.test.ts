import { describe, expect, it } from "vitest";
import { maskSensitiveValue } from "@/lib/masking";

describe("masking", () => {
  it("masks phone, id, bank and salary", () => {
    expect(maskSensitiveValue("13812345678", "phone")).toBe("138****5678");
    expect(maskSensitiveValue("340111199001011234", "idNumber")).toContain("1234");
    expect(maskSensitiveValue("6225880012341234", "bankAccount")).toBe("**** **** **** 1234");
    expect(maskSensitiveValue(12000, "salary")).toBe("无权限查看");
  });
});
