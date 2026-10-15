import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/tables/[id]/status - Get table status by ID (public - for client page)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const table = await prisma.table.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        label: true,
        active: true,
        restaurant_id: true,
        restaurant: { select: { active: true } },
      },
    });

    if (!table) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    if (!table.restaurant.active) {
      return NextResponse.json(
        { error: "Restaurant is inactive" },
        { status: 403 },
      );
    }

    if (!table.active) {
      return NextResponse.json({ error: "Table is inactive" }, { status: 400 });
    }

    // Check for open calls for this table
    const openCalls = await prisma.call.findMany({
      where: {
        table_id: table.id,
        status: "OPEN",
        restaurant_id: table.restaurant_id,
      },
      select: {
        id: true,
        type: true,
        created_at: true,
      },
      orderBy: { created_at: "desc" },
    });

    // Rating prompt: only the latest bill request resolved in the last 30
    // minutes that has no rating yet (never one per waiter call)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const unresolvedRatings = await prisma.call.findMany({
      where: {
        table_id: table.id,
        type: "REQUEST_BILL",
        status: "RESOLVED",
        resolved_at: { gte: thirtyMinutesAgo },
        rating: null,
        restaurant_id: table.restaurant_id,
      },
      select: {
        id: true,
        type: true,
        resolved_at: true,
      },
      orderBy: { resolved_at: "desc" },
      take: 1,
    });

    return NextResponse.json({
      id: table.id,
      label: table.label,
      openCalls,
      pendingRating: unresolvedRatings[0] || null,
    });
  } catch (error) {
    console.error("Error fetching table status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
