import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";
import {
  validationError,
  localeTextMap,
  allergensSchema,
  missingDefaultLocale,
  imageUrlSchema,
} from "@/lib/api";
import { getSettings } from "@/lib/settings";

const menuItemSchema = z.object({
  category_id: z.string(),
  names: localeTextMap(120),
  descriptions: localeTextMap(500).optional(),
  allergens: allergensSchema.optional(),
  price: z.number().min(0).max(99999.99),
  image_url: imageUrlSchema.optional().nullable(),
  order: z.number().int().min(0).optional(),
  active: z.boolean().optional(),
  restaurantId: z.string().optional(),
});

// GET /api/items - List items
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
    const categoryId = searchParams.get("categoryId");
    const activeOnly = searchParams.get("active") === "true";
    const restaurantIdParam = searchParams.get("restaurantId");
    const restaurantId =
      session.user.role === "SUPER_ADMIN"
        ? restaurantIdParam
        : session.user.restaurant_id;

    if (!restaurantId) {
      return NextResponse.json(
        { error: "restaurantId is required" },
        { status: 400 },
      );
    }

    const items = await prisma.menuItem.findMany({
      where: {
        restaurant_id: restaurantId,
        ...(categoryId ? { category_id: categoryId } : {}),
        ...(activeOnly ? { active: true } : {}),
      },
      include: {
        category: true,
      },
      orderBy: [{ category: { order: "asc" } }, { order: "asc" }],
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error("Error fetching items:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST /api/items - Create item (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const validation = menuItemSchema.safeParse(body);

    if (!validation.success) {
      return validationError(validation.error);
    }

    // Verify category exists
    const restaurantId =
      session.user.role === "SUPER_ADMIN"
        ? validation.data.restaurantId
        : session.user.restaurant_id;

    if (!restaurantId) {
      return NextResponse.json(
        { error: "restaurantId is required" },
        { status: 400 },
      );
    }

    const { default_locale } = await getSettings(restaurantId);
    const localeError = missingDefaultLocale(
      validation.data.names,
      default_locale,
    );
    if (localeError) return localeError;

    const category = await prisma.category.findFirst({
      where: {
        id: validation.data.category_id,
        restaurant_id: restaurantId,
      },
    });

    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 },
      );
    }

    // Get max order for this category
    const maxOrder = await prisma.menuItem.aggregate({
      where: {
        category_id: validation.data.category_id,
        restaurant_id: restaurantId,
      },
      _max: { order: true },
    });

    // restaurantId is input-only; the column is restaurant_id
    const { restaurantId: _restaurantId, ...data } = validation.data;

    const item = await prisma.menuItem.create({
      data: {
        ...data,
        order: data.order ?? (maxOrder._max.order ?? 0) + 1,
        restaurant_id: restaurantId,
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("Error creating item:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
