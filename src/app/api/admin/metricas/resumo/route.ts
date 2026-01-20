import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/admin/metricas/resumo - Resumo geral de metricas
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (
      session.user.role !== "ADMIN" &&
      session.user.role !== "MANAGER" &&
      session.user.role !== "SUPER_ADMIN"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const periodo = searchParams.get("periodo") || "today";
    const restaurantIdParam = searchParams.get("restaurantId");
    const restaurantId =
      session.user.role === "SUPER_ADMIN"
        ? restaurantIdParam
        : session.user.restaurant_id;

    // Calcular datas baseado no período
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    switch (periodo) {
      case "yesterday":
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setHours(23, 59, 59, 999);
        break;
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

    const restaurantFilter = restaurantId
      ? { restaurant_id: restaurantId }
      : {};

    // Buscar pedidos do período
    const orders = await prisma.order.findMany({
      where: {
        created_at: {
          gte: startDate,
          lte: endDate,
        },
        ...restaurantFilter,
      },
      select: {
        id: true,
        status: true,
        total: true,
        created_at: true,
        confirmed_at: true,
        preparing_at: true,
        ready_at: true,
        delivered_at: true,
      },
    });

    // Calcular métricas de pedidos
    const totalPedidos = orders.length;
    const pedidosConfirmados = orders.filter(
      (o) => o.status !== "PENDING" && o.status !== "CANCELLED",
    ).length;
    const pedidosCancelados = orders.filter(
      (o) => o.status === "CANCELLED",
    ).length;
    const taxaCancelamento =
      totalPedidos > 0 ? (pedidosCancelados / totalPedidos) * 100 : 0;

    const receitaTotal = orders
      .filter((o) => o.status !== "CANCELLED")
      .reduce((sum, o) => sum + Number(o.total), 0);

    const ticketMedio =
      pedidosConfirmados > 0 ? receitaTotal / pedidosConfirmados : 0;

    // Calcular tempos
    const pedidosComConfirmacao = orders.filter(
      (o) => o.confirmed_at && o.created_at,
    );
    const mediaConfirmacao =
      pedidosComConfirmacao.length > 0
        ? pedidosComConfirmacao.reduce((sum, o) => {
            const diff =
              new Date(o.confirmed_at!).getTime() -
              new Date(o.created_at).getTime();
            return sum + diff / 1000;
          }, 0) / pedidosComConfirmacao.length
        : 0;

    const pedidosComPreparo = orders.filter(
      (o) => o.ready_at && o.preparing_at,
    );
    const mediaPreparo =
      pedidosComPreparo.length > 0
        ? pedidosComPreparo.reduce((sum, o) => {
            const diff =
              new Date(o.ready_at!).getTime() -
              new Date(o.preparing_at!).getTime();
            return sum + diff / 1000;
          }, 0) / pedidosComPreparo.length
        : 0;

    const pedidosComEntrega = orders.filter(
      (o) => o.delivered_at && o.created_at,
    );
    const mediaTotal =
      pedidosComEntrega.length > 0
        ? pedidosComEntrega.reduce((sum, o) => {
            const diff =
              new Date(o.delivered_at!).getTime() -
              new Date(o.created_at).getTime();
            return sum + diff / 1000;
          }, 0) / pedidosComEntrega.length
        : 0;

    // SLA: pedidos prontos em menos de 15 minutos
    const pedidosComTempoPreparo = orders.filter(
      (o) => o.ready_at && o.confirmed_at,
    );
    const pedidosDentroSLA = pedidosComTempoPreparo.filter((o) => {
      const diff =
        new Date(o.ready_at!).getTime() - new Date(o.confirmed_at!).getTime();
      return diff <= 15 * 60 * 1000; // 15 minutos em ms
    });
    const slaPreparo =
      pedidosComTempoPreparo.length > 0
        ? (pedidosDentroSLA.length / pedidosComTempoPreparo.length) * 100
        : 100;

    // Pedidos atrasados (> 20 min)
    const pedidosAtrasados = pedidosComTempoPreparo.filter((o) => {
      const diff =
        new Date(o.ready_at!).getTime() - new Date(o.confirmed_at!).getTime();
      return diff > 20 * 60 * 1000;
    });
    const taxaAtrasados =
      pedidosComTempoPreparo.length > 0
        ? (pedidosAtrasados.length / pedidosComTempoPreparo.length) * 100
        : 0;

    // Buscar chamados
    const calls = await prisma.call.findMany({
      where: {
        created_at: {
          gte: startDate,
          lte: endDate,
        },
        ...restaurantFilter,
      },
      select: {
        id: true,
        type: true,
        status: true,
        created_at: true,
        resolved_at: true,
      },
    });

    const totalChamados = calls.length;
    const chamadosGarcom = calls.filter((c) => c.type === "CALL_WAITER").length;
    const chamadosConta = calls.filter((c) => c.type === "REQUEST_BILL").length;

    const chamadosResolvidos = calls.filter(
      (c) => c.resolved_at && c.created_at,
    );
    const tempoMedioAtendimento =
      chamadosResolvidos.length > 0
        ? chamadosResolvidos.reduce((sum, c) => {
            const diff =
              new Date(c.resolved_at!).getTime() -
              new Date(c.created_at).getTime();
            return sum + diff / 1000;
          }, 0) / chamadosResolvidos.length
        : 0;

    // Buscar avaliações
    const ratings = await prisma.rating.findMany({
      where: {
        created_at: {
          gte: startDate,
          lte: endDate,
        },
        ...restaurantFilter,
      },
      select: {
        stars: true,
      },
    });

    const totalAvaliacoes = ratings.length;
    const notaMedia =
      totalAvaliacoes > 0
        ? ratings.reduce((sum, r) => sum + r.stars, 0) / totalAvaliacoes
        : 0;
    const taxaAvaliacao =
      totalPedidos > 0 ? (totalAvaliacoes / totalPedidos) * 100 : 0;

    return NextResponse.json({
      pedidos: {
        total: totalPedidos,
        confirmados: pedidosConfirmados,
        cancelados: pedidosCancelados,
        taxaCancelamento: Math.round(taxaCancelamento * 100) / 100,
        ticketMedio: Math.round(ticketMedio * 100) / 100,
        receitaTotal: Math.round(receitaTotal * 100) / 100,
      },
      tempos: {
        mediaConfirmacao: Math.round(mediaConfirmacao),
        mediaPreparo: Math.round(mediaPreparo),
        mediaTotal: Math.round(mediaTotal),
        slaPreparo: Math.round(slaPreparo * 100) / 100,
        pedidosAtrasados: Math.round(taxaAtrasados * 100) / 100,
      },
      chamados: {
        total: totalChamados,
        garcom: chamadosGarcom,
        conta: chamadosConta,
        tempoMedioAtendimento: Math.round(tempoMedioAtendimento),
      },
      satisfacao: {
        notaMedia: Math.round(notaMedia * 10) / 10,
        totalAvaliacoes,
        taxaAvaliacao: Math.round(taxaAvaliacao * 100) / 100,
      },
    });
  } catch (error) {
    console.error("Error fetching metrics summary:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
