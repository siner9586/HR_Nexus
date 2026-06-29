export function isProductionRuntime() {
  return process.env.NODE_ENV === "production";
}

export function isDemoLoginEnabled() {
  if (process.env.DEMO_LOGIN_ENABLED) return process.env.DEMO_LOGIN_ENABLED === "true";
  return !isProductionRuntime();
}

export function isMaintenanceMode() {
  return process.env.MAINTENANCE_MODE === "true";
}

export function publicAppUrl() {
  return process.env.APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
}
