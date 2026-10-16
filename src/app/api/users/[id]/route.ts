import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { validationError, isUniqueViolation } from "@/lib/api";
import { hash } from "bcryptjs";
import type { Prisma } from "@prisma/client";
import type { Session } from "next-auth";

const updateUserSchema = z.object({
  email: z.string().trim().toLowerCase().email().optional(),
  password: z.string().min(6).optional(),
  name: z.string().min(1).max(100).optional(),
  role: z.enum(["WAITER", "ADMIN", "MANAGER", "KITCHEN"]).optional(),
  active: z.boolean().optional(),
});

// Roles a MANAGER is allowed to create or manage
const MANAGER_MANAGED_ROLES = ["WAITER", "KITCHEN"] as const;

// Users the caller may see. Restaurant staff never see the SUPER_ADMIN.
function viewableUser(
  user: Session["user"],
  id: string,
): Prisma.UserWhereInput {
  if (user.role === "SUPER_ADMIN") return { id };
  return {
    id,
    restaurant_id: user.restaurant_id,
    role: { not: "SUPER_ADMIN" },
  };
}

// Users the caller may modify or delete. A MANAGER only manages WAITER and
// KITCHEN users (plus their own profile, minus role/active).
function manageableUser(
  user: Session["user"],
  id: string,
): Prisma.UserWhereInput {
  if (user.role !== "MANAGER") return viewableUser(user, id);
  return {
    ...viewableUser(user, id),
    OR: [{ id: user.id }, { role: { in: [...MANAGER_MANAGED_ROLES] } }],
  };
}

// GET /api/users/[id] - Get single user
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
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

    const user = await prisma.user.findFirst({
      where: viewableUser(session.user, params.id),
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        created_at: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// PATCH /api/users/[id] - Update user
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
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

    const body = await request.json().catch(() => null);
    const validation = updateUserSchema.safeParse(body);

    if (!validation.success) {
      return validationError(validation.error);
    }

    const { password, ...data } = validation.data;

    const existingUser = await prisma.user.findFirst({
      where: manageableUser(session.user, params.id),
    });

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Nobody can change their own role or deactivate themselves
    if (
      existingUser.id === session.user.id &&
      ((data.role !== undefined && data.role !== existingUser.role) ||
        (data.active !== undefined && data.active !== existingUser.active))
    ) {
      return NextResponse.json(
        { error: "You cannot change your own role or active status" },
        { status: 400 },
      );
    }

    if (
      session.user.role === "MANAGER" &&
      data.role !== undefined &&
      data.role !== existingUser.role &&
      !(MANAGER_MANAGED_ROLES as readonly string[]).includes(data.role)
    ) {
      return NextResponse.json(
        { error: "Managers can only assign the WAITER or KITCHEN role" },
        { status: 403 },
      );
    }

    // If updating email, check if it's already in use
    if (data.email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email: data.email,
          NOT: { id: params.id },
        },
      });

      if (existingUser) {
        return NextResponse.json(
          { error: "Email already registered" },
          { status: 409 },
        );
      }
    }

    const updateData: Record<string, unknown> = { ...data };

    if (password) {
      updateData.password_hash = await hash(password, 12);
    }

    const user = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        created_at: true,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    if (isUniqueViolation(error)) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 },
      );
    }
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// DELETE /api/users/[id] - Delete user
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
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

    // Prevent self-deletion
    if (session.user.id === params.id) {
      return NextResponse.json(
        { error: "You cannot delete your own user" },
        { status: 400 },
      );
    }

    const existingUser = await prisma.user.findFirst({
      where: manageableUser(session.user, params.id),
    });

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await prisma.user.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
