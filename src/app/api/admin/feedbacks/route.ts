import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { validationError } from "@/lib/api";

const querySchema = z.object({
  stars: z.coerce.number().int().min(1).max(5).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export const dynamic = "force-dynamic";

// GET /api/admin/feedbacks - List feedbacks/ratings
export async function GET(request: NextRequest) {
  const session = await auth();

  if (
    !session ||
    (session.user.role !== "ADMIN" &&
      session.user.role !== "MANAGER" &&
      session.user.role !== "SUPER_ADMIN")
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = querySchema.safeParse({
    stars: searchParams.get("stars") || undefined,
    limit: searchParams.get("limit") || undefined,
  });

  if (!query.success) {
    return validationError(query.error);
  }

  const { stars, limit } = query.data;
  const restaurantIdParam = searchParams.get("restaurantId");
  const restaurantId =
    session.user.role === "SUPER_ADMIN"
      ? restaurantIdParam
      : session.user.restaurant_id;

  try {
    const where: Record<string, unknown> = restaurantId
      ? { restaurant_id: restaurantId }
      : {};

    if (stars) {
      where.stars = stars;
    }

    const ratings = await prisma.rating.findMany({
      where,
      orderBy: { created_at: "desc" },
      take: limit,
      include: {
        call: {
          include: {
            table: {
              select: {
                id: true,
                label: true,
              },
            },
            resolver: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // General statistics
    const stats = await prisma.rating.aggregate({
      where,
      _count: true,
      _avg: {
        stars: true,
      },
    });

    const distribution = await prisma.rating.groupBy({
      by: ["stars"],
      where,
      _count: true,
    });

    const negativeFeedbacks = await prisma.rating.count({
      where: {
        ...(restaurantId ? { restaurant_id: restaurantId } : {}),
        stars: { lte: 3 },
        feedback: { not: null },
      },
    });

    return NextResponse.json({
      ratings,
      stats: {
        total: stats._count,
        average: stats._avg.stars || 0,
        negativeFeedbacks,
        distribution: distribution.reduce(
          (acc, item) => {
            acc[item.stars] = item._count;
            return acc;
          },
          {} as Record<number, number>,
        ),
      },
    });
  } catch (error) {
    console.error("Error fetching feedbacks:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
