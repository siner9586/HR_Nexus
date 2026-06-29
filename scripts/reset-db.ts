import { execSync } from "node:child_process";

execSync("npx prisma db push --force-reset", { stdio: "inherit" });
execSync("npm run db:seed", { stdio: "inherit" });
