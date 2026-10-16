import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { findPublicTable } from "@/lib/public-table";

export const dynamic = "force-dynamic";

// GET /api/tables/status?table=<qr_token> - Open calls and pending rating (public)
export async function GET(request: NextRequest) {
  try {
    const found = await findPublicTable(
      request.nextUrl.searchParams.get("table"),
    );
    if ("error" in found) return found.error;
    const { table } = found;

    const openCalls = await prisma.call.findMany({
      where: {
        table_id: table.id,
        status: "OPEN",
        restaurant_id: table.restaurant_id,
      },
      select: { id: true, type: true, created_at: true },
      orderBy: { created_at: "desc" },
    });

    // Rating prompt: only the latest bill request resolved in the last 30
    // minutes that has no rating yet (never one per waiter call)
    const pendingRating = await prisma.call.findFirst({
      where: {
        table_id: table.id,
        type: "REQUEST_BILL",
        status: "RESOLVED",
        resolved_at: { gte: new Date(Date.now() - 30 * 60 * 1000) },
        rating: null,
        restaurant_id: table.restaurant_id,
      },
      select: { id: true, type: true, resolved_at: true },
      orderBy: { resolved_at: "desc" },
    });

    return NextResponse.json({
      label: table.label,
      ordering_enabled: table.settings.ordering_enabled,
      openCalls,
      pendingRating,
    });
  } catch (error) {
    console.error("Error fetching table status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
