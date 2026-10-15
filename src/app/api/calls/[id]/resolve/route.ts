import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// PATCH /api/calls/[id]/resolve - Mark call as resolved
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
      session.user.role !== "WAITER" &&
      session.user.role !== "ADMIN" &&
      session.user.role !== "MANAGER" &&
      session.user.role !== "SUPER_ADMIN"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const call = await prisma.call.findFirst({
      where:
        session.user.role === "SUPER_ADMIN"
          ? { id: params.id }
          : { id: params.id, restaurant_id: session.user.restaurant_id },
    });

    if (!call) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 });
    }

    if (call.status === "RESOLVED") {
      return NextResponse.json(
        { error: "Call already resolved" },
        { status: 409 },
      );
    }

    // Atomic transition: applies only if the call is still open
    const { count } = await prisma.call.updateMany({
      where: {
        id: params.id,
        restaurant_id: call.restaurant_id,
        status: "OPEN",
      },
      data: {
        status: "RESOLVED",
        resolved_at: new Date(),
        resolved_by: session.user.id,
      },
    });

    if (count === 0) {
      return NextResponse.json(
        { error: "Call already resolved" },
        { status: 409 },
      );
    }

    const updatedCall = await prisma.call.findUnique({
      where: { id: params.id },
      include: {
        table: {
          select: {
            id: true,
            label: true,
          },
        },
        resolver: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(updatedCall);
  } catch (error) {
    console.error("Error resolving call:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
