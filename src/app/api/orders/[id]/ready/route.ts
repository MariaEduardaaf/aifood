import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { emit, orderInclude } from "@/lib/events";

// PATCH /api/orders/[id]/ready - Mark order as ready (KITCHEN)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check that the user is kitchen staff
    if (
      session.user.role !== "KITCHEN" &&
      session.user.role !== "SUPER_ADMIN"
    ) {
      return NextResponse.json(
        { error: "Only kitchen staff can mark orders as ready" },
        { status: 403 },
      );
    }

    const order = await prisma.order.findFirst({
      where:
        session.user.role === "SUPER_ADMIN"
          ? { id: params.id }
          : { id: params.id, restaurant_id: session.user.restaurant_id },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status !== "PREPARING") {
      return NextResponse.json(
        { error: "Order must be preparing before marking as ready" },
        { status: 409 },
      );
    }

    // Atomic transition: applies only if the status is still the expected one
    const { count } = await prisma.order.updateMany({
      where: {
        id: params.id,
        restaurant_id: order.restaurant_id,
        status: "PREPARING",
      },
      data: {
        status: "READY",
        ready_at: new Date(),
      },
    });

    if (count === 0) {
      return NextResponse.json(
        { error: "Order status changed, refresh and try again" },
        { status: 409 },
      );
    }

    const updatedOrder = await prisma.order.findUnique({
      where: { id: params.id },
      include: orderInclude,
    });

    emit(order.restaurant_id, {
      type: "order",
      action: "updated",
      id: params.id,
      status: updatedOrder?.status ?? "UNKNOWN",
    });

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error("Error marking order as ready:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
