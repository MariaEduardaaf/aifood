import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/menu - Public menu (active items only)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tableId = searchParams.get("tableId");
    let restaurantId: string | null = null;

    if (tableId) {
      const table = await prisma.table.findUnique({
        where: { id: tableId },
        select: {
          restaurant_id: true,
          active: true,
          restaurant: { select: { active: true } },
        },
      });

      if (!table || !table.active) {
        return NextResponse.json({ error: "Table not found" }, { status: 404 });
      }

      if (!table.restaurant.active) {
        return NextResponse.json(
          { error: "Restaurant is inactive" },
          { status: 403 },
        );
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

    const settings = await prisma.settings.findUnique({
      where: { restaurant_id: restaurantId },
      select: { currency: true },
    });

    return NextResponse.json({
      categories: nonEmptyCategories,
      currency: settings?.currency ?? "EUR",
    });
  } catch (error) {
    console.error("Error fetching menu:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
