import { hash } from "bcryptjs";
import { prisma } from "@/lib/db";

const email = process.argv[2] ?? "admin@platform.local";
const password = process.argv[3] ?? "Admin123456!";

const role = await prisma.role.findFirst({ where: { code: "PLATFORM_ADMIN", tenantId: null } });
if (!role) throw new Error("Run npm run db:seed first to create PLATFORM_ADMIN role.");

const user = await prisma.user.upsert({
  where: { email },
  update: { passwordHash: await hash(password, 12), status: "ACTIVE" },
  create: { email, name: "平台管理员", passwordHash: await hash(password, 12), userRoles: { create: { roleId: role.id } } },
});

console.log(`Platform admin ready: ${user.email}`);
