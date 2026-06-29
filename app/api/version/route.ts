import { NextResponse } from "next/server";
import { getVersionInfo } from "@/lib/version";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    success: true,
    data: getVersionInfo(),
    message: "ok",
  });
}
