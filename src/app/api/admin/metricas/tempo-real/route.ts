import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/admin/metricas/tempo-real - Dados em tempo real
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN" && session.user.role !== "MANAGER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Buscar pedidos ativos
    const pedidosAtivos = await prisma.order.findMany({
      where: {
        status: {
          in: ["PENDING", "CONFIRMED", "PREPARING", "READY"],
        },
      },
      select: {
        id: true,
        status: true,
        total: true,
        created_at: true,
        table: {
          select: {
            id: true,
            label: true,
          },
        },
      },
      orderBy: {
        created_at: "asc",
      },
    });

    // Contar por status
    const pendentes = pedidosAtivos.filter((o) => o.status === "PENDING").length;
    const confirmados = pedidosAtivos.filter((o) => o.status === "CONFIRMED").length;
    const preparando = pedidosAtivos.filter((o) => o.status === "PREPARING").length;
    const prontos = pedidosAtivos.filter((o) => o.status === "READY").length;

    // Chamados abertos
    const chamadosAbertos = await prisma.call.count({
      where: {
        status: "OPEN",
      },
    });

    // Mesas com pedidos ativos
    const mesasOcupadas = new Set(pedidosAtivos.map((o) => o.table.id)).size;

    // Últimos pedidos com tempo
    const now = Date.now();
    const ultimosPedidos = pedidosAtivos.slice(0, 10).map((pedido) => ({
      id: pedido.id,
      mesa: pedido.table.label,
      total: Number(pedido.total),
      status: pedido.status,
      tempo: Math.floor((now - new Date(pedido.created_at).getTime()) / 1000),
    }));

    // Gerar alertas
    const alertas: Array<{ tipo: string; mensagem: string }> = [];

    // Alertas de pedidos atrasados (> 15 min)
    pedidosAtivos
      .filter((o) => o.status !== "READY")
      .forEach((pedido) => {
        const tempoMinutos = Math.floor(
          (now - new Date(pedido.created_at).getTime()) / 60000
        );
        if (tempoMinutos >= 15 && tempoMinutos < 20) {
          alertas.push({
            tipo: "ATENCAO",
            mensagem: `Pedido ${pedido.table.label} aguardando há ${tempoMinutos} min`,
          });
        } else if (tempoMinutos >= 20) {
          alertas.push({
            tipo: "ATRASO",
            mensagem: `Pedido ${pedido.table.label} aguardando há ${tempoMinutos} min`,
          });
        }
      });

    // Alerta de muitos chamados abertos
    if (chamadosAbertos >= 5) {
      alertas.push({
        tipo: "ATENCAO",
        mensagem: `${chamadosAbertos} chamados aguardando atendimento`,
      });
    }

    return NextResponse.json({
      pedidosAtivos: {
        pendentes,
        confirmados,
        preparando,
        prontos,
      },
      chamadosAbertos,
      mesasOcupadas,
      ultimosPedidos,
      alertas: alertas.slice(0, 5), // Limitar a 5 alertas
    });
  } catch (error) {
    console.error("Error fetching real-time metrics:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
