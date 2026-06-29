export type PayrollInput = {
  baseSalary: number;
  overtimePay?: number;
  bonus?: number;
  allowances?: number;
  deductions?: number;
  socialSecurityPersonal?: number;
  providentFundPersonal?: number;
  companyCostExtra?: number;
};

export function calculatePayroll(input: PayrollInput) {
  const grossPay =
    input.baseSalary + (input.overtimePay ?? 0) + (input.bonus ?? 0) + (input.allowances ?? 0);
  const deductions =
    (input.deductions ?? 0) + (input.socialSecurityPersonal ?? 0) + (input.providentFundPersonal ?? 0);
  const netPay = Math.max(grossPay - deductions, 0);
  const companyCost = grossPay + (input.companyCostExtra ?? 0);
  return { grossPay, deductions, netPay, companyCost };
}

export function buildPayslipDetails(input: PayrollInput) {
  const result = calculatePayroll(input);
  return {
    earnings: {
      baseSalary: input.baseSalary,
      overtimePay: input.overtimePay ?? 0,
      bonus: input.bonus ?? 0,
      allowances: input.allowances ?? 0,
    },
    deductions: {
      deductions: input.deductions ?? 0,
      socialSecurityPersonal: input.socialSecurityPersonal ?? 0,
      providentFundPersonal: input.providentFundPersonal ?? 0,
    },
    totals: result,
  };
}
