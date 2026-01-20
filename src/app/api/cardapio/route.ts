import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/cardapio - Cardápio público (apenas itens ativos)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tableId = searchParams.get("tableId");
    let restaurantId: string | null = null;

    if (tableId) {
      const table = await prisma.table.findUnique({
        where: { id: tableId },
        select: { restaurant_id: true, active: true },
      });

      if (!table || !table.active) {
        return NextResponse.json({ error: "Table not found" }, { status: 404 });
      }

      restaurantId = table.restaurant_id;
    } else {
      const session = await auth();
      if (!session) {
        return NextResponse.json(
          { error: "tableId is required" },
          { status: 400 },
        );
      }
      restaurantId = session.user.restaurant_id;
    }

    const categories = await prisma.category.findMany({
      where: { active: true, restaurant_id: restaurantId },
      include: {
        items: {
          where: { active: true, restaurant_id: restaurantId },
          orderBy: { order: "asc" },
          select: {
            id: true,
            name_pt: true,
            name_es: true,
            name_en: true,
            description_pt: true,
            description_es: true,
            description_en: true,
            price: true,
            image_url: true,
          },
        },
      },
      orderBy: { order: "asc" },
    });

    // Filter out empty categories
    const nonEmptyCategories = categories.filter((cat) => cat.items.length > 0);

    return NextResponse.json(nonEmptyCategories);
  } catch (error) {
    console.error("Error fetching menu:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
