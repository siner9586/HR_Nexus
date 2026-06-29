import { hash } from "bcryptjs";
import { prisma } from "@/lib/db";

const email = process.env.ADMIN_EMAIL ?? process.argv[2] ?? "admin@platform.local";
const password = process.env.ADMIN_PASSWORD ?? process.argv[3] ?? "Admin123456!";
const name = process.env.ADMIN_NAME ?? process.argv[4] ?? "平台管理员";

if (process.env.NODE_ENV === "production" && (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD || password === "Admin123456!" || password.length < 12)) {
  throw new Error("Production admin creation requires ADMIN_EMAIL and a strong ADMIN_PASSWORD. Do not use the demo password.");
}

const role = await prisma.role.findFirst({ where: { code: "PLATFORM_ADMIN", tenantId: null } });
if (!role) throw new Error("Run npm run db:seed:minimal first to create PLATFORM_ADMIN role.");

const user = await prisma.user.upsert({
  where: { email },
  update: { name, passwordHash: await hash(password, 12), status: "ACTIVE" },
  create: { email, name, passwordHash: await hash(password, 12), userRoles: { create: { roleId: role.id } } },
});
await prisma.userRole.createMany({ data: [{ userId: user.id, roleId: role.id }], skipDuplicates: true });
await prisma.auditLog.create({
  data: { tenantId: null, actorUserId: user.id, action: "CREATE", module: "admin", targetType: "User", targetId: user.id, metadata: { script: "create-admin" } },
});

console.log(`Platform admin ready: ${user.email}`);
