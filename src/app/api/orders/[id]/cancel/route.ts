import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// PATCH /api/orders/[id]/cancel - Cancel order
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
      !["WAITER", "ADMIN", "MANAGER", "SUPER_ADMIN"].includes(session.user.role)
    ) {
      return NextResponse.json(
        { error: "Only waiter or admin can cancel orders" },
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

    // Cannot cancel an order that was already delivered
    if (order.status === "DELIVERED") {
      return NextResponse.json(
        { error: "Cannot cancel delivered order" },
        { status: 409 },
      );
    }

    if (order.status === "CANCELLED") {
      return NextResponse.json(
        { error: "Order already cancelled" },
        { status: 409 },
      );
    }

    // Atomic transition: applies only if the status is still the expected one
    const { count } = await prisma.order.updateMany({
      where: {
        id: params.id,
        restaurant_id: order.restaurant_id,
        status: { notIn: ["DELIVERED", "CANCELLED"] },
      },
      data: {
        status: "CANCELLED",
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
      include: {
        table: {
          select: {
            id: true,
            label: true,
          },
        },
      },
    });

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error("Error cancelling order:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
