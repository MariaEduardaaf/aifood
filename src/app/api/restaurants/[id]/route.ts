import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { validationError, isUniqueViolation } from "@/lib/api";

const restaurantSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  slug: z.string().min(1).max(120).optional(),
  domain: z.string().min(1).max(255).optional().nullable(),
  active: z.boolean().optional(),
});

// GET /api/restaurants/[id] - Get restaurant (SUPER_ADMIN)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();

  if (!session || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: params.id },
  });

  if (!restaurant) {
    return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
  }

  return NextResponse.json(restaurant);
}

// PATCH /api/restaurants/[id] - Update restaurant (SUPER_ADMIN)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await auth();

    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const validation = restaurantSchema.safeParse(body);

    if (!validation.success) {
      return validationError(validation.error);
    }

    const restaurant = await prisma.restaurant.update({
      where: { id: params.id },
      data: validation.data,
    });

    return NextResponse.json(restaurant);
  } catch (error) {
    if (isUniqueViolation(error)) {
      return NextResponse.json(
        { error: "A restaurant with this slug or domain already exists" },
        { status: 409 },
      );
    }
    console.error("Error updating restaurant:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// DELETE /api/restaurants/[id] - Delete restaurant (SUPER_ADMIN)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await auth();

    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.restaurant.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting restaurant:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
