import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { findPublicTable } from "@/lib/public-table";

export const dynamic = "force-dynamic";

// GET /api/menu?table=<qr_token> - Public menu (active items only)
export async function GET(request: NextRequest) {
  try {
    const found = await findPublicTable(
      request.nextUrl.searchParams.get("table"),
    );
    if ("error" in found) return found.error;
    const { table } = found;

    const categories = await prisma.category.findMany({
      where: { active: true, restaurant_id: table.restaurant_id },
      select: {
        id: true,
        names: true,
        items: {
          where: { active: true, restaurant_id: table.restaurant_id },
          orderBy: { order: "asc" },
          select: {
            id: true,
            names: true,
            descriptions: true,
            allergens: true,
            price: true,
            image_url: true,
          },
        },
      },
      orderBy: { order: "asc" },
    });

    const { currency, enabled_locales, default_locale, ordering_enabled } =
      table.settings;

    return NextResponse.json({
      restaurant: { name: table.restaurant.name },
      table: { label: table.label },
      settings: { currency, enabled_locales, default_locale, ordering_enabled },
      // Empty categories are hidden from guests
      categories: categories.filter((cat) => cat.items.length > 0),
    });
  } catch (error) {
    console.error("Error fetching menu:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
