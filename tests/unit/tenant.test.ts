import { describe, expect, it } from "vitest";
import { PLAN_LIMITS } from "@/lib/constants";
import { assertPlanEmployeeLimit } from "@/lib/tenant";

describe("tenant", () => {
  it("enforces employee plan limits", () => {
    expect(PLAN_LIMITS.FREE.maxEmployees).toBe(20);
    expect(() => assertPlanEmployeeLimit("FREE", 20)).toThrow(/上限/);
    expect(() => assertPlanEmployeeLimit("PROFESSIONAL", 120)).not.toThrow();
  });
});
