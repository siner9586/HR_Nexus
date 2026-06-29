import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getVersionInfo } from "@/lib/version";

export const dynamic = "force-dynamic";

export async function GET() {
  const version = getVersionInfo();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      success: true,
      data: {
        status: "ok",
        database: "ok",
        timestamp: new Date().toISOString(),
        version: version.version,
        environment: version.nodeEnv,
      },
      message: "ok",
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: { code: "DATABASE_UNAVAILABLE", message: "Database health check failed" },
        data: {
          status: "degraded",
          database: "error",
          timestamp: new Date().toISOString(),
          version: version.version,
          environment: version.nodeEnv,
        },
      },
      { status: 503 },
    );
  }
}
