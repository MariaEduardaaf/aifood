import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/metricas - Get metrics (admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (
      !session ||
      (session.user.role !== "ADMIN" && session.user.role !== "MANAGER")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "today";

    // Calculate date range
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case "week":
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "month":
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case "today":
      default:
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
    }

    // Total calls in period
    const totalCalls = await prisma.call.count({
      where: {
        created_at: { gte: startDate },
      },
    });

    // Calls by type
    const callsByType = await prisma.call.groupBy({
      by: ["type"],
      where: {
        created_at: { gte: startDate },
      },
      _count: true,
    });

    // Resolved calls with response time
    const resolvedCalls = await prisma.call.findMany({
      where: {
        created_at: { gte: startDate },
        status: "RESOLVED",
        resolved_at: { not: null },
      },
      select: {
        created_at: true,
        resolved_at: true,
      },
    });

    // Calculate average response time
    let avgResponseTime = 0;
    let slaCount = 0;
    const SLA_THRESHOLD = 180; // 3 minutes in seconds

    if (resolvedCalls.length > 0) {
      const totalTime = resolvedCalls.reduce((sum, call) => {
        const responseTime =
          (new Date(call.resolved_at!).getTime() -
            new Date(call.created_at).getTime()) /
          1000;
        if (responseTime <= SLA_THRESHOLD) slaCount++;
        return sum + responseTime;
      }, 0);
      avgResponseTime = totalTime / resolvedCalls.length;
    }

    const slaPercentage =
      resolvedCalls.length > 0
        ? Math.round((slaCount / resolvedCalls.length) * 100)
        : 100;

    // Calls by hour (for today only)
    const callsByHour: Record<number, number> = {};

    if (period === "today") {
      const todayCalls = await prisma.call.findMany({
        where: {
          created_at: { gte: startDate },
        },
        select: {
          created_at: true,
        },
      });

      // Initialize all hours
      for (let i = 0; i < 24; i++) {
        callsByHour[i] = 0;
      }

      todayCalls.forEach((call) => {
        const hour = new Date(call.created_at).getHours();
        callsByHour[hour]++;
      });
    }

    // Calls by table
    const callsByTable = await prisma.call.groupBy({
      by: ["table_id"],
      where: {
        created_at: { gte: startDate },
      },
      _count: true,
      orderBy: {
        _count: {
          table_id: "desc",
        },
      },
      take: 10,
    });

    // Get table labels
    const tableIds = callsByTable.map((c) => c.table_id);
    const tables = await prisma.table.findMany({
      where: { id: { in: tableIds } },
      select: { id: true, label: true },
    });

    const callsByTableWithLabels = callsByTable.map((item) => ({
      tableId: item.table_id,
      label: tables.find((t) => t.id === item.table_id)?.label || "Unknown",
      count: item._count,
    }));

    // Calls by waiter (resolved)
    const callsByWaiter = await prisma.call.groupBy({
      by: ["resolved_by"],
      where: {
        created_at: { gte: startDate },
        status: "RESOLVED",
        resolved_by: { not: null },
      },
      _count: true,
      orderBy: {
        _count: {
          resolved_by: "desc",
        },
      },
    });

    // Get waiter names
    const waiterIds = callsByWaiter
      .map((c) => c.resolved_by)
      .filter(Boolean) as string[];
    const waiters = await prisma.user.findMany({
      where: { id: { in: waiterIds } },
      select: { id: true, name: true },
    });

    const callsByWaiterWithNames = callsByWaiter.map((item) => ({
      odBy: item.resolved_by,
      name: waiters.find((w) => w.id === item.resolved_by)?.name || "Unknown",
      count: item._count,
    }));

    // Open calls count
    const openCalls = await prisma.call.count({
      where: { status: "OPEN" },
    });

    // Rating metrics
    const ratings = await prisma.rating.findMany({
      where: {
        created_at: { gte: startDate },
      },
      select: {
        stars: true,
        redirected_google: true,
        feedback: true,
      },
    });

    const totalRatings = ratings.length;
    const avgRating =
      totalRatings > 0
        ? ratings.reduce((sum, r) => sum + r.stars, 0) / totalRatings
        : 0;
    const googleRedirects = ratings.filter((r) => r.redirected_google).length;
    const negativeFeedbacks = ratings.filter((r) => r.feedback).length;

    // Rating distribution
    const ratingDistribution: Record<number, number> = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };
    ratings.forEach((r) => {
      ratingDistribution[r.stars]++;
    });

    return NextResponse.json({
      period,
      totalCalls,
      openCalls,
      resolvedCalls: resolvedCalls.length,
      callsByType: callsByType.reduce(
        (acc, item) => {
          acc[item.type] = item._count;
          return acc;
        },
        {} as Record<string, number>,
      ),
      avgResponseTime: Math.round(avgResponseTime),
      slaPercentage,
      callsByHour,
      callsByTable: callsByTableWithLabels,
      callsByWaiter: callsByWaiterWithNames,
      ratings: {
        total: totalRatings,
        average: Math.round(avgRating * 10) / 10,
        googleRedirects,
        negativeFeedbacks,
        distribution: ratingDistribution,
      },
    });
  } catch (error) {
    console.error("Error fetching metrics:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
