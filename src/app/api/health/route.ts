import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/health - Liveness + database ping for the host's health check
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", db: "up" });
  } catch (error) {
    console.error("Health check failed:", error);
    return NextResponse.json({ status: "error", db: "down" }, { status: 503 });
  }
}
