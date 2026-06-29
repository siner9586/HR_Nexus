import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const root = process.cwd();

const modulePages = [
  ["organization", "organization"],
  ["organization/departments", "organization"],
  ["organization/positions", "organization"],
  ["organization/cost-centers", "organization"],
  ["onboarding", "onboarding"],
  ["lifecycle", "lifecycle"],
  ["lifecycle/regularization", "lifecycle"],
  ["lifecycle/transfer", "lifecycle"],
  ["lifecycle/salary-adjustment", "lifecycle"],
  ["lifecycle/termination", "lifecycle"],
  ["contracts", "contracts"],
  ["contracts/templates", "contracts"],
  ["attendance", "attendance"],
  ["attendance/clock-records", "attendance"],
  ["attendance/shifts", "attendance"],
  ["attendance/schedules", "attendance"],
  ["attendance/monthly", "attendance"],
  ["leave", "leave"],
  ["leave/requests", "leave"],
  ["leave/overtime", "leave"],
  ["leave/punch-corrections", "leave"],
  ["leave/balances", "leave"],
  ["payroll", "payroll"],
  ["payroll/items", "payroll"],
  ["payroll/structures", "payroll"],
  ["payroll/batches", "payroll"],
  ["payslips", "payslips"],
  ["social-security", "social-security"],
  ["workflows", "workflows"],
  ["approvals", "approvals"],
  ["recruitment", "recruitment"],
  ["recruitment/requests", "recruitment"],
  ["recruitment/jobs", "recruitment"],
  ["recruitment/candidates", "recruitment"],
  ["performance", "performance"],
  ["performance/cycles", "performance"],
  ["performance/reviews", "performance"],
  ["training", "training"],
  ["training/courses", "training"],
  ["training/tasks", "training"],
  ["notifications", "notifications"],
  ["files", "files"],
  ["settings", "settings"],
  ["settings/tenant", "settings"],
  ["settings/roles", "settings"],
  ["settings/fields", "settings"],
  ["settings/dictionaries", "settings"],
  ["settings/notifications", "settings"],
  ["settings/audit-logs", "audit-logs"],
];

for (const [route, moduleKey] of modulePages) {
  const file = join(root, "app", route, "page.tsx");
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(
    file,
    `import { ModulePage } from "@/components/shared/module-page";\n\nexport default function Page() {\n  return <ModulePage moduleKey="${moduleKey}" />;\n}\n`,
  );
}

const apiFolders = [
  "auth",
  "platform",
  "tenants",
  "users",
  "roles",
  "employees",
  "departments",
  "positions",
  "cost-centers",
  "onboarding",
  "lifecycle",
  "contracts",
  "attendance",
  "leave",
  "payroll",
  "payslips",
  "social-security",
  "workflows",
  "approvals",
  "recruitment",
  "performance",
  "training",
  "analytics",
  "notifications",
  "files",
  "exports",
  "audit-logs",
  "billing",
];

for (const folder of apiFolders) {
  const file = join(root, "app", "api", folder, ".gitkeep");
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, "Implemented by app/api/[...path]/route.ts\n");
}

console.log(`Generated ${modulePages.length} module pages and ${apiFolders.length} API placeholders.`);
