import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { validationError } from "@/lib/api";
import { Decimal } from "@prisma/client/runtime/library";
import { findPublicTable, orderingDisabled } from "@/lib/public-table";
import { emit } from "@/lib/events";

export const dynamic = "force-dynamic";

// Minimum seconds between two orders from the same table
const RATE_LIMIT_SECONDS = 10;

// Longest a guest sees a table's orders when no bill was settled meanwhile
const GUEST_WINDOW_MS = 3 * 60 * 60 * 1000;

const orderItemSchema = z.object({
  menuItemId: z.string(),
  quantity: z.number().int().min(1).max(50),
  notes: z.string().max(200).optional(),
});

const createOrderSchema = z.object({
  table: z.string().min(1).max(100), // qr_token
  items: z.array(orderItemSchema).min(1).max(30),
  notes: z.string().max(200).optional(),
});

// GET /api/orders?table=<qr_token> - List table orders (public)
// GET /api/orders - Active orders for staff (session)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tableToken = searchParams.get("table");

    if (tableToken === null) {
      const session = await auth();

      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      if (
        session.user.role !== "WAITER" &&
        session.user.role !== "ADMIN" &&
        session.user.role !== "MANAGER" &&
        session.user.role !== "SUPER_ADMIN"
      ) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const restaurantIdParam = searchParams.get("restaurantId");
      const restaurantId =
        session.user.role === "SUPER_ADMIN"
          ? restaurantIdParam
          : session.user.restaurant_id;

      if (!restaurantId) {
        return NextResponse.json(
          { error: "restaurantId is required" },
          { status: 400 },
        );
      }

      const orders = await prisma.order.findMany({
        where: {
          restaurant_id: restaurantId,
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

    const found = await findPublicTable(tableToken);
    if ("error" in found) return found.error;
    const { table } = found;
    if (!table.settings.ordering_enabled) return orderingDisabled();

    // Only the current party's orders: since the table's last settled bill,
    // and never older than GUEST_WINDOW_MS, so the next guests at the table
    // do not see what the previous ones ordered.
    const lastBill = await prisma.call.findFirst({
      where: {
        table_id: table.id,
        type: "REQUEST_BILL",
        status: "RESOLVED",
        resolved_at: { not: null },
      },
      orderBy: { resolved_at: "desc" },
      select: { resolved_at: true },
    });
    const since = Math.max(
      lastBill?.resolved_at?.getTime() ?? 0,
      Date.now() - GUEST_WINDOW_MS,
    );

    const orders = await prisma.order.findMany({
      where: {
        table_id: table.id,
        restaurant_id: table.restaurant_id,
        created_at: { gte: new Date(since) },
        status: { not: "CANCELLED" },
      },
      select: {
        id: true,
        status: true,
        total: true,
        notes: true,
        created_at: true,
        items: {
          select: {
            id: true,
            quantity: true,
            unit_price: true,
            notes: true,
            menuItem: {
              select: { id: true, names: true, image_url: true },
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

// POST /api/orders - Create new order (public, rate limited)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const validation = createOrderSchema.safeParse(body);

    if (!validation.success) {
      return validationError(validation.error);
    }

    const { items, notes } = validation.data;

    const found = await findPublicTable(validation.data.table);
    if ("error" in found) return found.error;
    const { table } = found;
    if (!table.settings.ordering_enabled) return orderingDisabled();
    const tableId = table.id;

    // Rate limiting per table, backed by the DB so it holds across serverless
    // instances. ponytail: check-then-insert is not atomic; two simultaneous
    // requests can both pass. Use a unique time-bucket or advisory lock if needed.
    const now = Date.now();
    const lastOrder = await prisma.order.findFirst({
      where: {
        table_id: tableId,
        created_at: { gte: new Date(now - RATE_LIMIT_SECONDS * 1000) },
      },
      orderBy: { created_at: "desc" },
      select: { created_at: true },
    });

    if (lastOrder) {
      const secondsSinceLastOrder =
        (now - lastOrder.created_at.getTime()) / 1000;
      if (secondsSinceLastOrder < RATE_LIMIT_SECONDS) {
        const waitTime = Math.ceil(RATE_LIMIT_SECONDS - secondsSinceLastOrder);
        return NextResponse.json(
          {
            error: "Rate limit exceeded",
            waitTime,
            message: `Wait ${waitTime} seconds before placing a new order`,
          },
          { status: 429 },
        );
      }
    }

    // Fetch all menu items to validate and get prices. The same item may
    // appear on several lines (e.g. different notes), so compare unique ids.
    const menuItemIds = Array.from(new Set(items.map((item) => item.menuItemId)));
    const menuItems = await prisma.menuItem.findMany({
      where: {
        id: { in: menuItemIds },
        active: true,
        restaurant_id: table.restaurant_id,
      },
    });

    // Validate that all items exist and are active
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

    // Calculate total and prepare order items
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

    // Create order with items
    const order = await prisma.order.create({
      data: {
        table_id: tableId,
        restaurant_id: table.restaurant_id,
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
              select: { id: true, names: true, image_url: true },
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

    emit(table.restaurant_id, {
      type: "order",
      action: "created",
      id: order.id,
      status: order.status,
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error("Error creating order:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
