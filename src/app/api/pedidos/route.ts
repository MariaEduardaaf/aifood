import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { Decimal } from "@prisma/client/runtime/library";

export const dynamic = "force-dynamic";

// Rate limit storage (in-memory for MVP)
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_SECONDS = 10;

const orderItemSchema = z.object({
  menuItemId: z.string(),
  quantity: z.number().int().min(1),
  notes: z.string().optional(),
});

const createOrderSchema = z.object({
  tableId: z.string(),
  items: z.array(orderItemSchema).min(1),
  notes: z.string().optional(),
});

// GET /api/pedidos?tableId=xxx - Listar pedidos da mesa (publico)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tableId = searchParams.get("tableId");

    if (!tableId) {
      const session = await auth();

      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      if (
        session.user.role !== "WAITER" &&
        session.user.role !== "ADMIN" &&
        session.user.role !== "MANAGER"
      ) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const orders = await prisma.order.findMany({
        where: {
          status: { in: ["PENDING", "CONFIRMED", "READY"] },
        },
        include: {
          table: {
            select: {
              id: true,
              label: true,
            },
          },
        },
        orderBy: { created_at: "desc" },
      });

      return NextResponse.json(orders);
    }

    // Verificar se mesa existe
    const table = await prisma.table.findUnique({
      where: { id: tableId },
    });

    if (!table) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    // Buscar pedidos da mesa (ultimas 24h, nao cancelados)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const orders = await prisma.order.findMany({
      where: {
        table_id: tableId,
        created_at: { gte: twentyFourHoursAgo },
        status: { not: "CANCELLED" },
      },
      include: {
        items: {
          include: {
            menuItem: {
              select: {
                id: true,
                name_pt: true,
                name_es: true,
                name_en: true,
                image_url: true,
              },
            },
          },
        },
      },
      orderBy: { created_at: "desc" },
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST /api/pedidos - Criar novo pedido (publico, rate limited)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = createOrderSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid data", details: validation.error.issues },
        { status: 400 },
      );
    }

    const { tableId, items, notes } = validation.data;

    // Verificar se mesa existe e esta ativa
    const table = await prisma.table.findUnique({
      where: { id: tableId },
    });

    if (!table) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    if (!table.active) {
      return NextResponse.json({ error: "Table is inactive" }, { status: 400 });
    }

    // Rate limiting por mesa
    const rateLimitKey = `order-${tableId}`;
    const lastOrderTime = rateLimitMap.get(rateLimitKey);
    const now = Date.now();

    if (lastOrderTime) {
      const secondsSinceLastOrder = (now - lastOrderTime) / 1000;
      if (secondsSinceLastOrder < RATE_LIMIT_SECONDS) {
        const waitTime = Math.ceil(RATE_LIMIT_SECONDS - secondsSinceLastOrder);
        return NextResponse.json(
          {
            error: "Rate limit exceeded",
            waitTime,
            message: `Aguarde ${waitTime} segundos antes de fazer um novo pedido`,
          },
          { status: 429 },
        );
      }
    }

    // Buscar todos os itens do menu para validar e pegar precos
    const menuItemIds = items.map((item) => item.menuItemId);
    const menuItems = await prisma.menuItem.findMany({
      where: {
        id: { in: menuItemIds },
        active: true,
      },
    });

    // Validar se todos os itens existem e estao ativos
    if (menuItems.length !== menuItemIds.length) {
      const foundIds = menuItems.map((item) => item.id);
      const missingIds = menuItemIds.filter((id) => !foundIds.includes(id));
      return NextResponse.json(
        {
          error: "Some menu items not found or inactive",
          missingIds,
        },
        { status: 400 },
      );
    }

    // Calcular total e preparar items do pedido
    let total = new Decimal(0);
    const orderItems = items.map((item) => {
      const menuItem = menuItems.find((mi) => mi.id === item.menuItemId)!;
      const itemTotal = menuItem.price.mul(item.quantity);
      total = total.add(itemTotal);

      return {
        menu_item_id: item.menuItemId,
        quantity: item.quantity,
        unit_price: menuItem.price,
        notes: item.notes || null,
      };
    });

    // Criar pedido com items
    const order = await prisma.order.create({
      data: {
        table_id: tableId,
        total,
        notes: notes || null,
        items: {
          create: orderItems,
        },
      },
      include: {
        items: {
          include: {
            menuItem: {
              select: {
                id: true,
                name_pt: true,
                name_es: true,
                name_en: true,
                image_url: true,
              },
            },
          },
        },
        table: {
          select: {
            label: true,
          },
        },
      },
    });

    // Atualizar rate limit
    rateLimitMap.set(rateLimitKey, now);

    // Limpar rate limit apos tempo
    setTimeout(() => {
      rateLimitMap.delete(rateLimitKey);
    }, RATE_LIMIT_SECONDS * 1000);

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error("Error creating order:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
