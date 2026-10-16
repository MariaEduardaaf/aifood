import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { getPeriodRange, SALE_EXCLUDED_STATUSES, zonedParts } from "@/lib/metrics";

export const dynamic = "force-dynamic";

// Stable weekday keys (Date.getDay() order); the admin chart translates them via i18n
const WEEKDAY_KEYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

// GET /api/admin/metrics/orders/weekday - Orders per weekday
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
    const period = searchParams.get("period") || "month";
    const restaurantIdParam = searchParams.get("restaurantId");
    const restaurantId =
      session.user.role === "SUPER_ADMIN"
        ? restaurantIdParam
        : session.user.restaurant_id;

    const settings = await getSettings(restaurantId);
    const { start: startDate, end: now } = getPeriodRange(period, settings.timezone);

    // Fetch orders for the period
    const orders = await prisma.order.findMany({
      where: {
        created_at: {
          gte: startDate,
          lte: now,
        },
        ...(restaurantId ? { restaurant_id: restaurantId } : {}),
        status: { notIn: SALE_EXCLUDED_STATUSES },
      },
      select: {
        created_at: true,
        total: true,
      },
    });

    // Group by weekday
    const dayMap = new Map<number, { quantity: number; revenue: number }>();

    // Initialize all days with 0
    for (let i = 0; i < 7; i++) {
      dayMap.set(i, { quantity: 0, revenue: 0 });
    }

    // Fill in with real data
    orders.forEach((order) => {
      const day = zonedParts(order.created_at, settings.timezone).weekday;
      const current = dayMap.get(day)!;
      dayMap.set(day, {
        quantity: current.quantity + 1,
        revenue: current.revenue + Number(order.total),
      });
    });

    // Convert to array
    const data = Array.from(dayMap.entries()).map(([day, data]) => ({
      day,
      key: WEEKDAY_KEYS[day],
      quantity: data.quantity,
      revenue: Math.round(data.revenue * 100) / 100,
    }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Error fetching orders by day:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
