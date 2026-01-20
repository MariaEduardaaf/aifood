import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";

export const dynamic = "force-dynamic";

const settingsSchema = z.object({
  google_reviews_url: z.string().url().optional().nullable(),
  google_reviews_enabled: z.boolean().optional(),
  min_stars_redirect: z.number().min(1).max(5).optional(),
  restaurantId: z.string().optional(),
});

// GET /api/settings - Get settings
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || session.user.role === "WAITER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
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

    let settings = await prisma.settings.findUnique({
      where: { restaurant_id: restaurantId },
    });

    // Create default settings if not exists
    if (!settings) {
      settings = await prisma.settings.create({
        data: {
          google_reviews_url: null,
          google_reviews_enabled: true,
          min_stars_redirect: 4,
          restaurant_id: restaurantId,
        },
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// PUT /api/settings - Update settings
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();

    if (
      !session ||
      (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = settingsSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid data", details: validation.error.issues },
        { status: 400 },
      );
    }

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

    const settings = await prisma.settings.upsert({
      where: { restaurant_id: restaurantId },
      update: validation.data,
      create: {
        ...validation.data,
        restaurant_id: restaurantId,
      },
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
