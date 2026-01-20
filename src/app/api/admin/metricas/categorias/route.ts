import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/admin/metricas/categorias - Receita por categoria
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
      case "today":
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        break;
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

    // Buscar itens de pedidos do período
    const orderItems = await prisma.orderItem.findMany({
      where: {
        order: {
          created_at: {
            gte: startDate,
            lte: now,
          },
          status: {
            not: "CANCELLED",
          },
        },
      },
      include: {
        menuItem: {
          include: {
            category: true,
          },
        },
      },
    });

    // Agrupar por categoria
    const categoriaMap = new Map<
      string,
      {
        id: string;
        nome: string;
        pedidos: Set<string>;
        itens: number;
        receita: number;
      }
    >();

    orderItems.forEach((item) => {
      const key = item.menuItem.category_id;
      const current = categoriaMap.get(key);
      const receita = Number(item.unit_price) * item.quantity;

      if (current) {
        current.pedidos.add(item.order_id);
        categoriaMap.set(key, {
          ...current,
          itens: current.itens + item.quantity,
          receita: current.receita + receita,
        });
      } else {
        const pedidos = new Set<string>();
        pedidos.add(item.order_id);
        categoriaMap.set(key, {
          id: item.menuItem.category_id,
          nome: item.menuItem.category.name_pt,
          pedidos,
          itens: item.quantity,
          receita,
        });
      }
    });

    // Calcular total para percentuais
    const totalReceita = Array.from(categoriaMap.values()).reduce(
      (sum, c) => sum + c.receita,
      0,
    );

    // Ordenar por receita
    const dados = Array.from(categoriaMap.values())
      .sort((a, b) => b.receita - a.receita)
      .map((categoria) => ({
        id: categoria.id,
        nome: categoria.nome,
        pedidos: categoria.pedidos.size,
        itens: categoria.itens,
        receita: Math.round(categoria.receita * 100) / 100,
        percentual:
          totalReceita > 0
            ? Math.round((categoria.receita / totalReceita) * 1000) / 10
            : 0,
      }));

    return NextResponse.json({ dados });
  } catch (error) {
    console.error("Error fetching categories metrics:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
