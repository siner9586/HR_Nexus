import type { AuthUser } from "./permissions";
import { assertPermission } from "./permissions";

export function assertExportAllowed(user: AuthUser, module: string) {
  if (module === "employees") assertPermission(user, "employees.export");
  if (module === "payroll") assertPermission(user, "payroll.export");
  if (module === "contracts") assertPermission(user, "contracts.export");
}
