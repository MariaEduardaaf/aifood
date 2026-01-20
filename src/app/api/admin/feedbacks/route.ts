import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/admin/feedbacks - Listar feedbacks/avaliações
export async function GET(request: NextRequest) {
  const session = await auth();

  if (
    !session ||
    (session.user.role !== "ADMIN" && session.user.role !== "MANAGER")
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const stars = searchParams.get("stars");
  const limit = parseInt(searchParams.get("limit") || "50");

  try {
    const where: Record<string, unknown> = {
      restaurant_id: session.user.restaurant_id,
    };

    if (stars) {
      where.stars = parseInt(stars);
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

    // Estatísticas gerais
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
        restaurant_id: session.user.restaurant_id,
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
