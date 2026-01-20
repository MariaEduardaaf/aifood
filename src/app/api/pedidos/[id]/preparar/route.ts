import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// PATCH /api/pedidos/[id]/preparar - Iniciar preparo do pedido (KITCHEN)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verificar se é usuário da cozinha
    if (session.user.role !== "KITCHEN") {
      return NextResponse.json(
        { error: "Only kitchen staff can start preparing orders" },
        { status: 403 },
      );
    }

    const order = await prisma.order.findFirst({
      where: { id: params.id, restaurant_id: session.user.restaurant_id },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status !== "CONFIRMED") {
      return NextResponse.json(
        { error: "Order must be confirmed before preparing" },
        { status: 400 },
      );
    }

    const updatedOrder = await prisma.order.update({
      where: { id: params.id },
      data: {
        status: "PREPARING",
        preparing_at: new Date(),
        prepared_by: session.user.id,
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
        preparer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error("Error starting order preparation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
