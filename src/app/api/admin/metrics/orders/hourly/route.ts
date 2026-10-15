import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/admin/metrics/orders/hourly - Orders per hour
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (
      session.user.role !== "ADMIN" &&
      session.user.role !== "MANAGER" &&
      session.user.role !== "SUPER_ADMIN"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "today";
    const restaurantIdParam = searchParams.get("restaurantId");
    const restaurantId =
      session.user.role === "SUPER_ADMIN"
        ? restaurantIdParam
        : session.user.restaurant_id;

    // Calculate dates based on the period
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    switch (period) {
      case "week":
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        break;
      case "30days":
      case "month":
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 1);
        startDate.setHours(0, 0, 0, 0);
        break;
      case "today":
      default:
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        break;
    }

    // Fetch orders for the period
    const orders = await prisma.order.findMany({
      where: {
        created_at: {
          gte: startDate,
          lte: endDate,
        },
        ...(restaurantId ? { restaurant_id: restaurantId } : {}),
        status: {
          not: "CANCELLED",
        },
      },
      select: {
        created_at: true,
        total: true,
      },
    });

    // Group by hour
    const hourMap = new Map<number, { quantity: number; revenue: number }>();

    // Initialize all hours with 0
    for (let i = 0; i < 24; i++) {
      hourMap.set(i, { quantity: 0, revenue: 0 });
    }

    // Fill in with real data
    orders.forEach((order) => {
      const hour = new Date(order.created_at).getHours();
      const current = hourMap.get(hour)!;
      hourMap.set(hour, {
        quantity: current.quantity + 1,
        revenue: current.revenue + Number(order.total),
      });
    });

    // Convert to array
    const data = Array.from(hourMap.entries()).map(([hour, data]) => ({
      hour,
      quantity: data.quantity,
      revenue: Math.round(data.revenue * 100) / 100,
    }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Error fetching orders by hour:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
