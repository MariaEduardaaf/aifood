import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";

const categorySchema = z.object({
  name_pt: z.string().min(1),
  name_es: z.string().min(1),
  name_en: z.string().min(1),
  order: z.number().optional(),
  active: z.boolean().optional(),
});

// GET /api/categorias - Listar categorias
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
    const activeOnly = searchParams.get("active") === "true";

    const categories = await prisma.category.findMany({
      where: activeOnly
        ? { active: true, restaurant_id: session.user.restaurant_id }
        : { restaurant_id: session.user.restaurant_id },
      include: {
        items: {
          where: activeOnly
            ? { active: true, restaurant_id: session.user.restaurant_id }
            : { restaurant_id: session.user.restaurant_id },
          orderBy: { order: "asc" },
        },
      },
      orderBy: { order: "asc" },
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST /api/categorias - Criar categoria (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = categorySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid data", details: validation.error.issues },
        { status: 400 },
      );
    }

    // Get max order
    const maxOrder = await prisma.category.aggregate({
      _max: { order: true },
      where: { restaurant_id: session.user.restaurant_id },
    });

    const category = await prisma.category.create({
      data: {
        ...validation.data,
        order: validation.data.order ?? (maxOrder._max.order ?? 0) + 1,
        restaurant_id: session.user.restaurant_id,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error("Error creating category:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
