import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPeriodRange, SALE_EXCLUDED_STATUSES } from "@/lib/metrics";
import { getLocale } from "next-intl/server";
import { localizedName } from "@/lib/utils";

export const dynamic = "force-dynamic";

// GET /api/admin/metrics/categories - Revenue per category
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

    const { start: startDate, end: now } = getPeriodRange(period);

    // Fetch order items for the period
    const locale = await getLocale();

    const orderItems = await prisma.orderItem.findMany({
      where: {
        order: {
          created_at: {
            gte: startDate,
            lte: now,
          },
          ...(restaurantId ? { restaurant_id: restaurantId } : {}),
          status: { notIn: SALE_EXCLUDED_STATUSES },
        },
      },
      include: {
        menuItem: {
          include: {
            category: true,
          },
        },
      },
    });

    // Group by category
    const categoryMap = new Map<
      string,
      {
        id: string;
        name: string;
        orders: Set<string>;
        items: number;
        revenue: number;
      }
    >();

    orderItems.forEach((item) => {
      const key = item.menuItem.category_id;
      const current = categoryMap.get(key);
      const revenue = Number(item.unit_price) * item.quantity;

      if (current) {
        current.orders.add(item.order_id);
        categoryMap.set(key, {
          ...current,
          items: current.items + item.quantity,
          revenue: current.revenue + revenue,
        });
      } else {
        const orders = new Set<string>();
        orders.add(item.order_id);
        categoryMap.set(key, {
          id: item.menuItem.category_id,
          name: localizedName(item.menuItem.category, locale),
          orders,
          items: item.quantity,
          revenue,
        });
      }
    });

    // Calculate total for percentages
    const totalRevenue = Array.from(categoryMap.values()).reduce(
      (sum, c) => sum + c.revenue,
      0,
    );

    // Sort by revenue
    const data = Array.from(categoryMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .map((category) => ({
        id: category.id,
        name: category.name,
        orders: category.orders.size,
        items: category.items,
        revenue: Math.round(category.revenue * 100) / 100,
        percentage:
          totalRevenue > 0
            ? Math.round((category.revenue / totalRevenue) * 1000) / 10
            : 0,
      }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Error fetching categories metrics:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
