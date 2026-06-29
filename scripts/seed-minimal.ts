import "dotenv/config";
import { PrismaClient, type TenantPlan } from "@prisma/client";
import { hash } from "bcryptjs";
import { PERMISSIONS, ROLE_LABELS, ROLE_PERMISSIONS, type SystemRole } from "../lib/constants";

const prisma = new PrismaClient();

const plans: Array<{
  code: TenantPlan;
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  maxEmployees: number | null;
  maxStorageGB: number;
  includedAiCredits: number;
  features: string[];
  sortOrder: number;
  isPublic?: boolean;
}> = [
  { code: "FREE", name: "免费版", description: "适合小团队试用。", priceMonthly: 0, priceYearly: 0, maxEmployees: 20, maxStorageGB: 1, includedAiCredits: 0, features: ["员工档案", "组织架构", "基础审批"], sortOrder: 1 },
  { code: "STANDARD", name: "标准版", description: "适合成长型企业。", priceMonthly: 399, priceYearly: 3999, maxEmployees: 100, maxStorageGB: 20, includedAiCredits: 50, features: ["员工", "组织", "合同", "请假", "审批", "基础考勤"], sortOrder: 2 },
  { code: "PROFESSIONAL", name: "专业版", description: "适合完整 HR 数字化。", priceMonthly: 999, priceYearly: 9999, maxEmployees: 500, maxStorageGB: 100, includedAiCredits: 300, features: ["标准版全部", "薪资", "招聘", "绩效", "培训", "数据分析"], sortOrder: 3 },
  { code: "ENTERPRISE", name: "企业版", description: "面向集团和多组织企业。", priceMonthly: 2999, priceYearly: 29999, maxEmployees: 3000, maxStorageGB: 500, includedAiCredits: 1000, features: ["专业版全部", "多公司", "API", "审计增强"], sortOrder: 4 },
  { code: "PRIVATE_DEPLOYMENT", name: "私有化部署", description: "年度授权、私有部署和专属支持。", priceMonthly: 0, priceYearly: 0, maxEmployees: null, maxStorageGB: 9999, includedAiCredits: 0, features: ["私有部署", "定制开发", "年度运维"], sortOrder: 5, isPublic: false },
];

function stripeMonthlyPriceId(code: TenantPlan) {
  if (code === "STANDARD") return process.env.STRIPE_PRICE_STANDARD_MONTHLY || null;
  if (code === "PROFESSIONAL") return process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY || null;
  if (code === "ENTERPRISE") return process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY || null;
  return null;
}

function stripeYearlyPriceId(code: TenantPlan) {
  if (code === "STANDARD") return process.env.STRIPE_PRICE_STANDARD_YEARLY || null;
  if (code === "PROFESSIONAL") return process.env.STRIPE_PRICE_PROFESSIONAL_YEARLY || null;
  if (code === "ENTERPRISE") return process.env.STRIPE_PRICE_ENTERPRISE_YEARLY || null;
  return null;
}

async function seedPlans() {
  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { code: plan.code },
      update: {
        name: plan.name,
        description: plan.description,
        priceMonthly: plan.priceMonthly,
        priceYearly: plan.priceYearly,
        maxEmployees: plan.maxEmployees,
        maxStorageGB: plan.maxStorageGB,
        includedAiCredits: plan.includedAiCredits,
        features: plan.features,
        isPublic: plan.isPublic ?? true,
        sortOrder: plan.sortOrder,
        stripeMonthlyPriceId: stripeMonthlyPriceId(plan.code),
        stripeYearlyPriceId: stripeYearlyPriceId(plan.code),
      },
      create: {
        ...plan,
        features: plan.features,
        isPublic: plan.isPublic ?? true,
        stripeMonthlyPriceId: stripeMonthlyPriceId(plan.code),
        stripeYearlyPriceId: stripeYearlyPriceId(plan.code),
      },
    });
  }
}

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
  await seedPlans();
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
