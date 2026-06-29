import { format } from "date-fns";

export function formatCurrency(value: number | string | null | undefined, currency = "CNY") {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("zh-CN", { style: "currency", currency }).format(amount);
}

export function formatDate(value: Date | string | null | undefined) {
  if (!value) return "-";
  return format(new Date(value), "yyyy-MM-dd");
}

export function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}
