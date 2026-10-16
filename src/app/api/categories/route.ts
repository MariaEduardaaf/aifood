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

const categorySchema = z.object({
  names: localeTextMap(120),
  order: z.number().int().min(0).optional(),
  active: z.boolean().optional(),
  restaurantId: z.string().optional(),
});

// GET /api/categories - List categories
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

    const categories = await prisma.category.findMany({
      where: activeOnly
        ? { active: true, restaurant_id: restaurantId }
        : { restaurant_id: restaurantId },
      include: {
        items: {
          where: activeOnly
            ? { active: true, restaurant_id: restaurantId }
            : { restaurant_id: restaurantId },
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

// POST /api/categories - Create category (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (
      !session ||
      (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const validation = categorySchema.safeParse(body);

    if (!validation.success) {
      return validationError(validation.error);
    }

    // Get max order
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

    // restaurantId is input-only; the column is restaurant_id
    const { restaurantId: _restaurantId, ...data } = validation.data;

    const { default_locale } = await getSettings(restaurantId);
    const localeError = missingDefaultLocale(data.names, default_locale);
    if (localeError) return localeError;

    const maxOrder = await prisma.category.aggregate({
      _max: { order: true },
      where: { restaurant_id: restaurantId },
    });

    const category = await prisma.category.create({
      data: {
        ...data,
        order: data.order ?? (maxOrder._max.order ?? 0) + 1,
        restaurant_id: restaurantId,
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
