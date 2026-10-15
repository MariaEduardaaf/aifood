import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { validationError, isUniqueViolation } from "@/lib/api";
import { hash } from "bcryptjs";

const createUserSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(6),
  name: z.string().min(1).max(100),
  role: z.enum(["WAITER", "ADMIN", "MANAGER", "KITCHEN"]),
  restaurantId: z.string().optional(),
});

// GET /api/users - List all users
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
    const restaurantIdParam = searchParams.get("restaurantId");
    const restaurantId =
      session.user.role === "SUPER_ADMIN"
        ? restaurantIdParam
        : session.user.restaurant_id;

    const users = await prisma.user.findMany({
      where:
        session.user.role === "SUPER_ADMIN"
          ? restaurantId
            ? { restaurant_id: restaurantId }
            : undefined
          : {
              restaurant_id: session.user.restaurant_id,
              role: { not: "SUPER_ADMIN" },
            },
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        created_at: true,
        _count: {
          select: {
            resolved_calls: true,
          },
        },
      },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST /api/users - Create new user
export async function POST(request: NextRequest) {
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

    const body = await request.json().catch(() => null);
    const validation = createUserSchema.safeParse(body);

    if (!validation.success) {
      return validationError(validation.error);
    }

    const {
      email,
      password,
      name,
      role,
      restaurantId: restaurantIdInput,
    } = validation.data;

    // Managers can only create waiter and kitchen staff
    if (
      session.user.role === "MANAGER" &&
      role !== "WAITER" &&
      role !== "KITCHEN"
    ) {
      return NextResponse.json(
        { error: "Managers can only create WAITER or KITCHEN users" },
        { status: 403 },
      );
    }

    const restaurantId =
      session.user.role === "SUPER_ADMIN"
        ? restaurantIdInput
        : session.user.restaurant_id;

    if (!restaurantId) {
      return NextResponse.json(
        { error: "restaurantId is required" },
        { status: 400 },
      );
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 },
      );
    }

    const password_hash = await hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        password_hash,
        name,
        role,
        active: true,
        restaurant_id: restaurantId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        created_at: true,
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 },
      );
    }
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
