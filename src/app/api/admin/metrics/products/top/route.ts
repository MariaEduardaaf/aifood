import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPeriodRange, SALE_EXCLUDED_STATUSES } from "@/lib/metrics";
import { getLocale } from "next-intl/server";
import { localizedName } from "@/lib/utils";

export const dynamic = "force-dynamic";

// GET /api/admin/metrics/products/top - Top-selling products
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
    const limit = parseInt(searchParams.get("limit") || "10");
    const restaurantIdParam = searchParams.get("restaurantId");
    const restaurantId =
      session.user.role === "SUPER_ADMIN"
        ? restaurantIdParam
        : session.user.restaurant_id;

    const { start: startDate, end: now } = getPeriodRange(period);

    // Fetch order items for the period with aggregation
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

    // Group by product
    const productMap = new Map<
      string,
      {
        id: string;
        name: string;
        category: string;
        quantity: number;
        revenue: number;
      }
    >();

    orderItems.forEach((item) => {
      const key = item.menu_item_id;
      const current = productMap.get(key);
      const revenue = Number(item.unit_price) * item.quantity;

      if (current) {
        productMap.set(key, {
          ...current,
          quantity: current.quantity + item.quantity,
          revenue: current.revenue + revenue,
        });
      } else {
        productMap.set(key, {
          id: item.menu_item_id,
          name: localizedName(item.menuItem, locale),
          category: localizedName(item.menuItem.category, locale),
          quantity: item.quantity,
          revenue,
        });
      }
    });

    // Sort by quantity and take top N
    const totalQuantity = Array.from(productMap.values()).reduce(
      (sum, p) => sum + p.quantity,
      0,
    );

    const data = Array.from(productMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, limit)
      .map((product) => ({
        ...product,
        revenue: Math.round(product.revenue * 100) / 100,
        percentage:
          totalQuantity > 0
            ? Math.round((product.quantity / totalQuantity) * 1000) / 10
            : 0,
      }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Error fetching top products:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
