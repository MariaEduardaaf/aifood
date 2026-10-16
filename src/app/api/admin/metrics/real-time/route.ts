import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/admin/metrics/real-time - Real-time data
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
    const restaurantIdParam = searchParams.get("restaurantId");
    const restaurantId =
      session.user.role === "SUPER_ADMIN"
        ? restaurantIdParam
        : session.user.restaurant_id;

    // Fetch active orders
    const activeOrders = await prisma.order.findMany({
      where: {
        status: {
          in: ["PENDING", "CONFIRMED", "PREPARING", "READY"],
        },
        ...(restaurantId ? { restaurant_id: restaurantId } : {}),
      },
      select: {
        id: true,
        status: true,
        total: true,
        created_at: true,
        table: {
          select: {
            id: true,
            label: true,
          },
        },
      },
      orderBy: {
        created_at: "asc",
      },
    });

    // Count by status
    const pending = activeOrders.filter(
      (o) => o.status === "PENDING",
    ).length;
    const confirmed = activeOrders.filter(
      (o) => o.status === "CONFIRMED",
    ).length;
    const preparing = activeOrders.filter(
      (o) => o.status === "PREPARING",
    ).length;
    const ready = activeOrders.filter((o) => o.status === "READY").length;

    // Open calls
    const openCalls = await prisma.call.count({
      where: {
        status: "OPEN",
        ...(restaurantId ? { restaurant_id: restaurantId } : {}),
      },
    });

    // Tables with active orders
    const occupiedTables = new Set(activeOrders.map((o) => o.table.id)).size;

    // Latest orders with elapsed time
    const now = Date.now();
    const recentOrders = activeOrders.slice(0, 10).map((order) => ({
      id: order.id,
      table: order.table.label,
      total: Number(order.total),
      status: order.status,
      createdAt: order.created_at,
    }));

    // Generate alerts
    const alerts: Array<{
      severity: "WARNING" | "DELAY";
      kind: "ORDER_WAITING" | "MANY_OPEN_CALLS";
      table?: string;
      minutes?: number;
      count?: number;
    }> = [];

    // Alerts for delayed orders (> 15 min)
    activeOrders
      .filter((o) => o.status !== "READY")
      .forEach((order) => {
        const minutes = Math.floor(
          (now - new Date(order.created_at).getTime()) / 60000,
        );
        if (minutes >= 15 && minutes < 20) {
          alerts.push({
            severity: "WARNING",
            kind: "ORDER_WAITING",
            table: order.table.label,
            minutes,
          });
        } else if (minutes >= 20) {
          alerts.push({
            severity: "DELAY",
            kind: "ORDER_WAITING",
            table: order.table.label,
            minutes,
          });
        }
      });

    // Alert for many open calls
    if (openCalls >= 5) {
      alerts.push({
        severity: "WARNING",
        kind: "MANY_OPEN_CALLS",
        count: openCalls,
      });
    }

    return NextResponse.json({
      activeOrders: {
        pending,
        confirmed,
        preparing,
        ready,
      },
      openCalls,
      occupiedTables,
      recentOrders,
      alerts: alerts.slice(0, 5), // Limit to 5 alerts
    });
  } catch (error) {
    console.error("Error fetching real-time metrics:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
