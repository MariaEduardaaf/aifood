import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";

const menuItemSchema = z.object({
  category_id: z.string(),
  name_pt: z.string().min(1),
  name_es: z.string().min(1),
  name_en: z.string().min(1),
  description_pt: z.string().optional().nullable(),
  description_es: z.string().optional().nullable(),
  description_en: z.string().optional().nullable(),
  price: z.number().positive(),
  image_url: z.string().url().optional().nullable(),
  order: z.number().optional(),
  active: z.boolean().optional(),
  restaurantId: z.string().optional(),
});

// GET /api/itens - Listar itens
export async function GET(request: NextRequest) {
  try {
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

// POST /api/itens - Criar item (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (
      !session ||
      (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = menuItemSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid data", details: validation.error.issues },
        { status: 400 },
      );
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

    const item = await prisma.menuItem.create({
      data: {
        ...validation.data,
        order: validation.data.order ?? (maxOrder._max.order ?? 0) + 1,
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
