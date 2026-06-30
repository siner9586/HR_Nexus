const required = ["DATABASE_URL", "NEXTAUTH_SECRET", "APP_URL"];
const missing = required.filter((key) => !process.env[key]);

if (missing.length) {
  console.error(`Missing environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

console.log("Environment looks ready for HR Nexus.");
