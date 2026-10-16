import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { emit, orderInclude } from "@/lib/events";

// PATCH /api/orders/[id]/confirm - Confirm order
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
        { error: "Only waiter or admin can confirm orders" },
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

    if (order.status !== "PENDING") {
      return NextResponse.json(
        { error: "Order is not pending" },
        { status: 409 },
      );
    }

    // Atomic transition: applies only if the status is still the expected one
    const { count } = await prisma.order.updateMany({
      where: {
        id: params.id,
        restaurant_id: order.restaurant_id,
        status: "PENDING",
      },
      data: {
        status: "CONFIRMED",
        confirmed_at: new Date(),
        confirmed_by: session.user.id,
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
    console.error("Error confirming order:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
