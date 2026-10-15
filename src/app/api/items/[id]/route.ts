import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { validationError } from "@/lib/api";

const menuItemUpdateSchema = z.object({
  category_id: z.string().optional(),
  name_pt: z.string().min(1).optional(),
  name_es: z.string().min(1).optional(),
  name_en: z.string().min(1).optional(),
  description_pt: z.string().optional().nullable(),
  description_es: z.string().optional().nullable(),
  description_en: z.string().optional().nullable(),
  price: z.number().min(0).max(99999.99).optional(),
  image_url: z.string().url().optional().nullable(),
  order: z.number().int().min(0).optional(),
  active: z.boolean().optional(),
});

// GET /api/items/[id] - Get item
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
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

    const item = await prisma.menuItem.findFirst({
      where:
        session.user.role === "SUPER_ADMIN"
          ? { id: params.id }
          : { id: params.id, restaurant_id: session.user.restaurant_id },
      include: { category: true },
    });

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error("Error fetching item:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// PUT /api/items/[id] - Update item
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await auth();

    if (
      !session ||
      (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const validation = menuItemUpdateSchema.safeParse(body);

    if (!validation.success) {
      return validationError(validation.error);
    }

    // If changing category, verify it exists
    if (validation.data.category_id) {
      const category = await prisma.category.findFirst({
        where:
          session.user.role === "SUPER_ADMIN"
            ? { id: validation.data.category_id }
            : {
                id: validation.data.category_id,
                restaurant_id: session.user.restaurant_id,
              },
      });

      if (!category) {
        return NextResponse.json(
          { error: "Category not found" },
          { status: 404 },
        );
      }
    }

    const existingItem = await prisma.menuItem.findFirst({
      where:
        session.user.role === "SUPER_ADMIN"
          ? { id: params.id }
          : { id: params.id, restaurant_id: session.user.restaurant_id },
    });

    if (!existingItem) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const item = await prisma.menuItem.update({
      where: { id: params.id },
      data: validation.data,
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error("Error updating item:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// DELETE /api/items/[id] - Delete item
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await auth();

    if (
      !session ||
      (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const existingItem = await prisma.menuItem.findFirst({
      where:
        session.user.role === "SUPER_ADMIN"
          ? { id: params.id }
          : { id: params.id, restaurant_id: session.user.restaurant_id },
    });

    if (!existingItem) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    await prisma.menuItem.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting item:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
