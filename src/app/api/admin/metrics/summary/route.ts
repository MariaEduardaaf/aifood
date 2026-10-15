import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPeriodRange, SALE_EXCLUDED_STATUSES } from "@/lib/metrics";

export const dynamic = "force-dynamic";

// GET /api/admin/metrics/summary - General metrics summary
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

    const { start: startDate, end: endDate } = getPeriodRange(period);

    const restaurantFilter = restaurantId
      ? { restaurant_id: restaurantId }
      : {};

    // Fetch orders for the period
    const orders = await prisma.order.findMany({
      where: {
        created_at: {
          gte: startDate,
          lte: endDate,
        },
        ...restaurantFilter,
      },
      select: {
        id: true,
        status: true,
        total: true,
        created_at: true,
        confirmed_at: true,
        preparing_at: true,
        ready_at: true,
        delivered_at: true,
      },
    });

    // Calculate order metrics
    const totalOrders = orders.length;
    const confirmedOrders = orders.filter(
      (o) => o.status !== "PENDING" && o.status !== "CANCELLED",
    ).length;
    const cancelledOrders = orders.filter(
      (o) => o.status === "CANCELLED",
    ).length;
    const cancellationRate =
      totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0;

    // Revenue only counts accepted orders (not PENDING, not CANCELLED)
    const totalRevenue = orders
      .filter((o) => !SALE_EXCLUDED_STATUSES.includes(o.status))
      .reduce((sum, o) => sum + Number(o.total), 0);

    const averageTicket =
      confirmedOrders > 0 ? totalRevenue / confirmedOrders : 0;

    // Calculate times
    const ordersWithConfirmation = orders.filter(
      (o) => o.confirmed_at && o.created_at,
    );
    const avgConfirmation =
      ordersWithConfirmation.length > 0
        ? ordersWithConfirmation.reduce((sum, o) => {
            const diff =
              new Date(o.confirmed_at!).getTime() -
              new Date(o.created_at).getTime();
            return sum + diff / 1000;
          }, 0) / ordersWithConfirmation.length
        : 0;

    const ordersWithPreparation = orders.filter(
      (o) => o.ready_at && o.preparing_at,
    );
    const avgPreparation =
      ordersWithPreparation.length > 0
        ? ordersWithPreparation.reduce((sum, o) => {
            const diff =
              new Date(o.ready_at!).getTime() -
              new Date(o.preparing_at!).getTime();
            return sum + diff / 1000;
          }, 0) / ordersWithPreparation.length
        : 0;

    const ordersWithDelivery = orders.filter(
      (o) => o.delivered_at && o.created_at,
    );
    const avgTotal =
      ordersWithDelivery.length > 0
        ? ordersWithDelivery.reduce((sum, o) => {
            const diff =
              new Date(o.delivered_at!).getTime() -
              new Date(o.created_at).getTime();
            return sum + diff / 1000;
          }, 0) / ordersWithDelivery.length
        : 0;

    // SLA: orders ready in under 15 minutes
    const ordersWithPrepTime = orders.filter(
      (o) => o.ready_at && o.confirmed_at,
    );
    const ordersWithinSla = ordersWithPrepTime.filter((o) => {
      const diff =
        new Date(o.ready_at!).getTime() - new Date(o.confirmed_at!).getTime();
      return diff <= 15 * 60 * 1000; // 15 minutes in ms
    });
    const preparationSla =
      ordersWithPrepTime.length > 0
        ? (ordersWithinSla.length / ordersWithPrepTime.length) * 100
        : 100;

    // Delayed orders (> 20 min)
    const delayedOrders = ordersWithPrepTime.filter((o) => {
      const diff =
        new Date(o.ready_at!).getTime() - new Date(o.confirmed_at!).getTime();
      return diff > 20 * 60 * 1000;
    });
    const delayedRate =
      ordersWithPrepTime.length > 0
        ? (delayedOrders.length / ordersWithPrepTime.length) * 100
        : 0;

    // Fetch calls
    const calls = await prisma.call.findMany({
      where: {
        created_at: {
          gte: startDate,
          lte: endDate,
        },
        ...restaurantFilter,
      },
      select: {
        id: true,
        type: true,
        status: true,
        created_at: true,
        resolved_at: true,
      },
    });

    const totalCalls = calls.length;
    const waiterCalls = calls.filter((c) => c.type === "CALL_WAITER").length;
    const billCalls = calls.filter((c) => c.type === "REQUEST_BILL").length;

    const resolvedCalls = calls.filter(
      (c) => c.resolved_at && c.created_at,
    );
    const avgServiceTime =
      resolvedCalls.length > 0
        ? resolvedCalls.reduce((sum, c) => {
            const diff =
              new Date(c.resolved_at!).getTime() -
              new Date(c.created_at).getTime();
            return sum + diff / 1000;
          }, 0) / resolvedCalls.length
        : 0;

    // Fetch ratings
    const ratings = await prisma.rating.findMany({
      where: {
        created_at: {
          gte: startDate,
          lte: endDate,
        },
        ...restaurantFilter,
      },
      select: {
        stars: true,
      },
    });

    const totalReviews = ratings.length;
    const averageRating =
      totalReviews > 0
        ? ratings.reduce((sum, r) => sum + r.stars, 0) / totalReviews
        : 0;
    // Customers are only prompted to rate after a resolved bill request,
    // so that is the denominator (not orders, which can be many per bill)
    const resolvedBillCalls = calls.filter(
      (c) => c.type === "REQUEST_BILL" && c.status === "RESOLVED",
    ).length;
    const reviewRate =
      resolvedBillCalls > 0
        ? Math.min(100, (totalReviews / resolvedBillCalls) * 100)
        : 0;

    return NextResponse.json({
      orders: {
        total: totalOrders,
        confirmed: confirmedOrders,
        cancelled: cancelledOrders,
        cancellationRate: Math.round(cancellationRate * 100) / 100,
        averageTicket: Math.round(averageTicket * 100) / 100,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
      },
      times: {
        avgConfirmation: Math.round(avgConfirmation),
        avgPreparation: Math.round(avgPreparation),
        avgTotal: Math.round(avgTotal),
        preparationSla: Math.round(preparationSla * 100) / 100,
        delayedOrdersRate: Math.round(delayedRate * 100) / 100,
      },
      calls: {
        total: totalCalls,
        waiter: waiterCalls,
        bill: billCalls,
        avgServiceTime: Math.round(avgServiceTime),
      },
      satisfaction: {
        averageRating: Math.round(averageRating * 10) / 10,
        totalReviews,
        reviewRate: Math.round(reviewRate * 100) / 100,
      },
    });
  } catch (error) {
    console.error("Error fetching metrics summary:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
