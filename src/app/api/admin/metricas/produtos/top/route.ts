import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/admin/metricas/produtos/top - Top produtos mais vendidos
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
    const limite = parseInt(searchParams.get("limite") || "10");

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

    // Buscar itens de pedidos do período com agregação
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

    // Agrupar por produto
    const produtoMap = new Map<
      string,
      {
        id: string;
        nome: string;
        categoria: string;
        quantidade: number;
        receita: number;
      }
    >();

    orderItems.forEach((item) => {
      const key = item.menu_item_id;
      const current = produtoMap.get(key);
      const receita = Number(item.unit_price) * item.quantity;

      if (current) {
        produtoMap.set(key, {
          ...current,
          quantidade: current.quantidade + item.quantity,
          receita: current.receita + receita,
        });
      } else {
        produtoMap.set(key, {
          id: item.menu_item_id,
          nome: item.menuItem.name_pt,
          categoria: item.menuItem.category.name_pt,
          quantidade: item.quantity,
          receita,
        });
      }
    });

    // Ordenar por quantidade e pegar top N
    const totalQuantidade = Array.from(produtoMap.values()).reduce(
      (sum, p) => sum + p.quantidade,
      0,
    );

    const dados = Array.from(produtoMap.values())
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, limite)
      .map((produto) => ({
        ...produto,
        receita: Math.round(produto.receita * 100) / 100,
        percentual:
          totalQuantidade > 0
            ? Math.round((produto.quantidade / totalQuantidade) * 1000) / 10
            : 0,
      }));

    return NextResponse.json({ dados });
  } catch (error) {
    console.error("Error fetching top products:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
