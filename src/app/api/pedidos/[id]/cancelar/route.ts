import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// PATCH /api/pedidos/[id]/cancelar - Cancelar pedido
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!["WAITER", "ADMIN", "MANAGER"].includes(session.user.role)) {
      return NextResponse.json(
        { error: "Only waiter or admin can cancel orders" },
        { status: 403 },
      );
    }

    const order = await prisma.order.findFirst({
      where: { id: params.id, restaurant_id: session.user.restaurant_id },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Nao pode cancelar se ja foi entregue
    if (order.status === "DELIVERED") {
      return NextResponse.json(
        { error: "Cannot cancel delivered order" },
        { status: 400 },
      );
    }

    if (order.status === "CANCELLED") {
      return NextResponse.json(
        { error: "Order already cancelled" },
        { status: 400 },
      );
    }

    const updatedOrder = await prisma.order.update({
      where: { id: params.id },
      data: {
        status: "CANCELLED",
      },
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
