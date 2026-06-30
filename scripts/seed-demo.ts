export {};

if (process.env.NODE_ENV === "production" && process.env.DEMO_SEED !== "true") {
  throw new Error("Refusing to run demo seed in production without DEMO_SEED=true.");
}

async function main() {
  await import("../prisma/seed");
}

void main();
