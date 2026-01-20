import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/admin/metricas/pedidos/hora - Pedidos por hora
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN" && session.user.role !== "MANAGER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const periodo = searchParams.get("periodo") || "today";

    // Calcular datas baseado no período
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    switch (periodo) {
      case "week":
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        break;
      case "month":
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 1);
        startDate.setHours(0, 0, 0, 0);
        break;
      case "today":
      default:
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        break;
    }

    // Buscar pedidos do período
    const orders = await prisma.order.findMany({
      where: {
        created_at: {
          gte: startDate,
          lte: endDate,
        },
        restaurant_id: session.user.restaurant_id,
        status: {
          not: "CANCELLED",
        },
      },
      select: {
        created_at: true,
        total: true,
      },
    });

    // Agrupar por hora
    const horaMap = new Map<number, { quantidade: number; receita: number }>();

    // Inicializar todas as horas com 0
    for (let i = 0; i < 24; i++) {
      horaMap.set(i, { quantidade: 0, receita: 0 });
    }

    // Preencher com dados reais
    orders.forEach((order) => {
      const hora = new Date(order.created_at).getHours();
      const current = horaMap.get(hora)!;
      horaMap.set(hora, {
        quantidade: current.quantidade + 1,
        receita: current.receita + Number(order.total),
      });
    });

    // Converter para array
    const dados = Array.from(horaMap.entries()).map(([hora, data]) => ({
      hora,
      quantidade: data.quantidade,
      receita: Math.round(data.receita * 100) / 100,
    }));

    return NextResponse.json({ dados });
  } catch (error) {
    console.error("Error fetching orders by hour:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
