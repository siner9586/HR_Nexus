import type { Prisma } from "@prisma/client";
import { writeAuditLog } from "./audit";
import { maskSensitiveValue, type SensitiveValueType } from "./masking";
import type { AuthUser } from "./permissions";
import { assertPermission, hasPermission } from "./permissions";
import type { PermissionCode } from "./constants";

export type ExportColumn<T extends Record<string, unknown> = Record<string, unknown>> = {
  key: keyof T | string;
  header: string;
  fieldType?: SensitiveValueType | "date" | "money" | "number" | "json";
  sensitive?: boolean;
  getValue?: (record: T) => unknown;
};

const moduleExportPermissions: Record<string, PermissionCode> = {
  employees: "employees.export",
  organization: "organization.export",
  departments: "organization.export",
  positions: "organization.export",
  "cost-centers": "organization.export",
  onboarding: "onboarding.export",
  lifecycle: "lifecycle.export",
  contracts: "contracts.export",
  attendance: "attendance.export",
  leave: "leave.export",
  payroll: "payroll.export",
  social_security: "social_security.export",
  "social-security": "social_security.export",
  approvals: "approvals.export",
  workflows: "workflows.export",
  recruitment: "recruitment.export",
  performance: "performance.export",
  training: "training.export",
  notifications: "notifications.export",
  files: "files.export",
  audit_logs: "audit_logs.export",
  "audit-logs": "audit_logs.export",
  analytics: "analytics.export",
};

export function assertExportAllowed(user: AuthUser, module: string) {
  const permission = moduleExportPermissions[module];
  if (permission) assertPermission(user, permission);
  else assertPermission(user, "exports.manage");
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function buildExportFilename(moduleName: string, now = new Date()) {
  const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `hr-nexus-${moduleName}-${timestamp}.csv`;
}

function formatDate(value: Date) {
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())} ${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

export function formatCsvValue(value: unknown, fieldType?: ExportColumn["fieldType"]) {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return formatDate(value);
  if (fieldType === "date") {
    const date = new Date(String(value));
    return Number.isNaN(date.getTime()) ? String(value) : formatDate(date);
  }
  if (fieldType === "money") {
    const amount = Number(value);
    return Number.isFinite(amount) ? amount.toFixed(2) : String(value);
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function escapeCsv(value: string) {
  if (/[",\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function maskExportField(value: unknown, fieldType: ExportColumn["fieldType"], user: AuthUser) {
  if (hasPermission(user, "employees.view_sensitive") || hasPermission(user, "payroll.view_sensitive")) return value;
  if (fieldType === "phone" || fieldType === "bankAccount" || fieldType === "idNumber" || fieldType === "salary" || fieldType === "contractAttachment") {
    return maskSensitiveValue(value, fieldType);
  }
  return value;
}

export function recordsToCsv<T extends Record<string, unknown>>(records: T[], columns: ExportColumn<T>[], user?: AuthUser) {
  const header = columns.map((column) => escapeCsv(column.header)).join(",");
  const rows = records.map((record) =>
    columns
      .map((column) => {
        const rawValue = column.getValue ? column.getValue(record) : record[column.key as keyof T];
        const value = user && column.sensitive ? maskExportField(rawValue, column.fieldType, user) : rawValue;
        return escapeCsv(formatCsvValue(value, column.fieldType));
      })
      .join(","),
  );
  return `\uFEFF${[header, ...rows].join("\r\n")}`;
}

export function createCsvResponse(csv: string, filename: string) {
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

export function applyExportLimit<T>(records: T[], limit = 5000) {
  return records.slice(0, limit);
}

export async function auditExport(user: AuthUser, module: string, filters: Record<string, unknown>) {
  return writeAuditLog({
    tenantId: user.tenantId,
    actorUserId: user.id,
    action: "EXPORT",
    module,
    targetType: "ExportJob",
    metadata: filters as Prisma.InputJsonValue,
  });
}
