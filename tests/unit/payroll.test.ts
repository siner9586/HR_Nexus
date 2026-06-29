import { describe, expect, it } from "vitest";
import { calculatePayroll } from "@/lib/payroll";

describe("payroll", () => {
  it("calculates gross, deductions, net and company cost", () => {
    const result = calculatePayroll({ baseSalary: 10000, bonus: 1000, deductions: 500, socialSecurityPersonal: 800, companyCostExtra: 2200 });
    expect(result.grossPay).toBe(11000);
    expect(result.deductions).toBe(1300);
    expect(result.netPay).toBe(9700);
    expect(result.companyCost).toBe(13200);
  });
});
