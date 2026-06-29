import type { AuditAction, Prisma } from "@prisma/client";
import { prisma } from "./db";

export async function writeAuditLog(input: {
  tenantId?: string | null;
  actorUserId?: string | null;
  action: AuditAction;
  module: string;
  targetType?: string | null;
  targetId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Prisma.InputJsonValue;
}) {
  return prisma.auditLog.create({
    data: {
      tenantId: input.tenantId ?? null,
      actorUserId: input.actorUserId ?? null,
      action: input.action,
      module: input.module,
      targetType: input.targetType ?? null,
      targetId: input.targetId ?? null,
      ip: input.ip ?? null,
      userAgent: input.userAgent ?? null,
      metadata: input.metadata ?? {},
    },
  });
}

export async function auditSensitiveAccess(input: {
  tenantId?: string | null;
  actorUserId?: string | null;
  module: string;
  targetType?: string;
  targetId?: string;
  field?: string;
}) {
  return writeAuditLog({
    ...input,
    action: "SENSITIVE_VIEW",
    metadata: { field: input.field },
  });
}
