import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { PERMISSIONS, ROLE_LABELS, ROLE_PERMISSIONS, type SystemRole } from "../lib/constants";

const prisma = new PrismaClient();

async function seedPermissions() {
  for (const code of PERMISSIONS) {
    const [module, action] = code.split(".");
    await prisma.permission.upsert({
      where: { code },
      update: { module, action, description: code },
      create: { code, module, action, description: code },
    });
  }
}

async function seedPlatformRole() {
  const roleCode: SystemRole = "PLATFORM_ADMIN";
  const existingRole = await prisma.role.findFirst({ where: { tenantId: null, code: roleCode } });
  const role =
    existingRole ??
    (await prisma.role.create({
      data: { tenantId: null, code: roleCode, name: ROLE_LABELS[roleCode], description: ROLE_LABELS[roleCode], isSystem: true },
    }));
  await prisma.role.update({ where: { id: role.id }, data: { name: ROLE_LABELS[roleCode], description: ROLE_LABELS[roleCode], isSystem: true } });

  const permissionRows = await prisma.permission.findMany({
    where: { code: { in: [...(ROLE_PERMISSIONS[roleCode] ?? [])] } },
    select: { id: true },
  });
  await prisma.rolePermission.createMany({
    data: permissionRows.map((permission) => ({ roleId: role.id, permissionId: permission.id })),
    skipDuplicates: true,
  });
  const dataScope = await prisma.dataScope.findFirst({ where: { roleId: role.id } });
  if (!dataScope) await prisma.dataScope.create({ data: { roleId: role.id, scopeType: "ALL" } });
  return role;
}

async function seedAdmin(roleId: string) {
  const isProduction = process.env.NODE_ENV === "production";
  const email = process.env.ADMIN_EMAIL || "admin@platform.local";
  const password = process.env.ADMIN_PASSWORD || "Admin123456!";
  const name = process.env.ADMIN_NAME || "平台管理员";

  if (isProduction && (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD === "Admin123456!" || process.env.ADMIN_PASSWORD.length < 12)) {
    throw new Error("Production minimal seed requires ADMIN_EMAIL and a strong ADMIN_PASSWORD. Do not use the demo password.");
  }

  const user = await prisma.user.upsert({
    where: { email },
    update: { name, passwordHash: await hash(password, 12), status: "ACTIVE" },
    create: { email, name, passwordHash: await hash(password, 12), status: "ACTIVE" },
  });
  await prisma.userRole.createMany({ data: [{ userId: user.id, roleId }], skipDuplicates: true });
  await prisma.auditLog.create({
    data: { tenantId: null, actorUserId: user.id, action: "CREATE", module: "admin", targetType: "User", targetId: user.id, metadata: { seed: "minimal" } },
  });
  return user;
}

async function main() {
  await seedPermissions();
  const role = await seedPlatformRole();
  const user = await seedAdmin(role.id);
  console.log(`Minimal production seed complete. Platform admin: ${user.email}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
