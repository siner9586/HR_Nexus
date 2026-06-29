import { maskSensitiveValue, type SensitiveValueType } from "@/lib/masking";

export function SensitiveValue({
  value,
  type = "text",
  canView,
}: {
  value: unknown;
  type?: SensitiveValueType;
  canView: boolean;
}) {
  return <span>{canView ? String(value ?? "-") : maskSensitiveValue(value, type)}</span>;
}
