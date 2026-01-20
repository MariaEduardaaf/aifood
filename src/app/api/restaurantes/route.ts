import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const restaurantSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z.string().min(1).max(120),
  domain: z.string().min(1).max(255).optional().nullable(),
  active: z.boolean().optional(),
});

// GET /api/restaurantes - List restaurants (SUPER_ADMIN)
export async function GET() {
  const session = await auth();

  if (!session || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const restaurants = await prisma.restaurant.findMany({
    orderBy: { created_at: "desc" },
  });

  return NextResponse.json(restaurants);
}

// POST /api/restaurantes - Create restaurant (SUPER_ADMIN)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = restaurantSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid data", details: validation.error.issues },
        { status: 400 },
      );
    }

    const restaurant = await prisma.restaurant.create({
      data: {
        name: validation.data.name.trim(),
        slug: validation.data.slug.trim(),
        domain: validation.data.domain?.trim() || null,
        active: validation.data.active ?? true,
      },
    });

    return NextResponse.json(restaurant, { status: 201 });
  } catch (error) {
    console.error("Error creating restaurant:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
