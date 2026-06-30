export const APP_NAME = "HR Nexus";

export function getVersionInfo() {
  return {
    name: APP_NAME,
    version: process.env.APP_VERSION || "1.0.0",
    commit: process.env.VERCEL_GIT_COMMIT_SHA || process.env.GIT_COMMIT_SHA || "local",
    buildTime: process.env.BUILD_TIME || (process.env.VERCEL ? "vercel" : "local"),
    nodeEnv: process.env.NODE_ENV || "development",
  };
}
