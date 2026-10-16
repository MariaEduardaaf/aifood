import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";
import {
  validationError,
  localeTextMap,
  missingDefaultLocale,
} from "@/lib/api";
import { getSettings } from "@/lib/settings";

const categoryUpdateSchema = z.object({
  names: localeTextMap(120).optional(),
  order: z.number().int().min(0).optional(),
  active: z.boolean().optional(),
});

// GET /api/categories/[id] - Get category
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

    const category = await prisma.category.findFirst({
      where:
        session.user.role === "SUPER_ADMIN"
          ? { id: params.id }
          : { id: params.id, restaurant_id: session.user.restaurant_id },
      include: {
        items: {
          orderBy: { order: "asc" },
        },
      },
    });

    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(category);
  } catch (error) {
    console.error("Error fetching category:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// PUT /api/categories/[id] - Update category
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
    const validation = categoryUpdateSchema.safeParse(body);

    if (!validation.success) {
      return validationError(validation.error);
    }

    const existingCategory = await prisma.category.findFirst({
      where:
        session.user.role === "SUPER_ADMIN"
          ? { id: params.id }
          : { id: params.id, restaurant_id: session.user.restaurant_id },
    });

    if (!existingCategory) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 },
      );
    }

    if (validation.data.names) {
      const { default_locale } = await getSettings(
        existingCategory.restaurant_id,
      );
      const localeError = missingDefaultLocale(
        validation.data.names,
        default_locale,
      );
      if (localeError) return localeError;
    }

    const category = await prisma.category.update({
      where: { id: params.id },
      data: validation.data,
    });

    return NextResponse.json(category);
  } catch (error) {
    console.error("Error updating category:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// DELETE /api/categories/[id] - Delete category
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

    const existingCategory = await prisma.category.findFirst({
      where:
        session.user.role === "SUPER_ADMIN"
          ? { id: params.id }
          : { id: params.id, restaurant_id: session.user.restaurant_id },
    });

    if (!existingCategory) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 },
      );
    }

    await prisma.category.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting category:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
