import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// PATCH /api/pedidos/[id]/entregar - Marcar pedido como entregue
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
        { error: "Only waiter or admin can deliver orders" },
        { status: 403 },
      );
    }

    const order = await prisma.order.findFirst({
      where: { id: params.id, restaurant_id: session.user.restaurant_id },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Pode entregar apenas se estiver READY
    if (order.status !== "READY") {
      return NextResponse.json(
        { error: "Order must be ready before delivery" },
        { status: 400 },
      );
    }

    const updatedOrder = await prisma.order.update({
      where: { id: params.id },
      data: {
        status: "DELIVERED",
        delivered_at: new Date(),
      },
      include: {
        table: {
          select: {
            id: true,
            label: true,
          },
        },
        items: {
          include: {
            menuItem: {
              select: {
                id: true,
                name_pt: true,
                name_es: true,
                name_en: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error("Error delivering order:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
