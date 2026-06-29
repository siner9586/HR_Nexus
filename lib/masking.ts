export type SensitiveValueType =
  | "idNumber"
  | "phone"
  | "bankAccount"
  | "salary"
  | "contractAttachment"
  | "text";

export function maskSensitiveValue(value: unknown, type: SensitiveValueType = "text") {
  if (value === null || value === undefined || value === "") return "";
  const text = String(value);

  if (type === "salary") return "无权限查看";
  if (type === "contractAttachment") return "无权限下载";
  if (type === "phone") return text.replace(/^(\d{3})\d{4}(\d{4})$/, "$1****$2");
  if (type === "bankAccount") return `**** **** **** ${text.slice(-4)}`;
  if (type === "idNumber") {
    if (text.length <= 8) return `${text.slice(0, 2)}****${text.slice(-2)}`;
    return `${text.slice(0, 3)}***********${text.slice(-4)}`;
  }
  if (text.length <= 2) return "*".repeat(text.length);
  return `${text.slice(0, 1)}${"*".repeat(Math.min(text.length - 2, 6))}${text.slice(-1)}`;
}

export function maskEmployeeFields<T extends { phone?: string | null; idNumberMasked?: string | null }>(
  employee: T,
  canViewSensitive: boolean,
) {
  if (canViewSensitive) return employee;
  return {
    ...employee,
    phone: employee.phone ? maskSensitiveValue(employee.phone, "phone") : employee.phone,
    idNumberMasked: employee.idNumberMasked
      ? maskSensitiveValue(employee.idNumberMasked, "idNumber")
      : employee.idNumberMasked,
  };
}
