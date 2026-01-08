import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const DIAS_SEMANA = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

// GET /api/admin/metricas/pedidos/dia-semana - Pedidos por dia da semana
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
    const periodo = searchParams.get("periodo") || "month";

    // Calcular datas baseado no período
    const now = new Date();
    let startDate: Date;

    switch (periodo) {
      case "week":
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        break;
      case "month":
      default:
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 1);
        startDate.setHours(0, 0, 0, 0);
        break;
    }

    // Buscar pedidos do período
    const orders = await prisma.order.findMany({
      where: {
        created_at: {
          gte: startDate,
          lte: now,
        },
        status: {
          not: "CANCELLED",
        },
      },
      select: {
        created_at: true,
        total: true,
      },
    });

    // Agrupar por dia da semana
    const diaMap = new Map<number, { quantidade: number; receita: number }>();

    // Inicializar todos os dias com 0
    for (let i = 0; i < 7; i++) {
      diaMap.set(i, { quantidade: 0, receita: 0 });
    }

    // Preencher com dados reais
    orders.forEach((order) => {
      const dia = new Date(order.created_at).getDay();
      const current = diaMap.get(dia)!;
      diaMap.set(dia, {
        quantidade: current.quantidade + 1,
        receita: current.receita + Number(order.total),
      });
    });

    // Converter para array
    const dados = Array.from(diaMap.entries()).map(([dia, data]) => ({
      dia,
      nome: DIAS_SEMANA[dia],
      quantidade: data.quantidade,
      receita: Math.round(data.receita * 100) / 100,
    }));

    return NextResponse.json({ dados });
  } catch (error) {
    console.error("Error fetching orders by day:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
