import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { OrderStatus } from "@prisma/client";
import { orderInclude } from "@/lib/events";
import { sseResponse } from "@/lib/sse";

export const dynamic = "force-dynamic";

// GET /api/orders/stream - Server-Sent Events for real-time orders.
// `refresh` carries the role's active list; `order` carries any changed order
// of the restaurant (clients drop orders whose status is outside their view).
export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userRole = session.user.role;

  if (
    userRole !== "WAITER" &&
    userRole !== "ADMIN" &&
    userRole !== "MANAGER" &&
    userRole !== "KITCHEN" &&
    userRole !== "SUPER_ADMIN"
  ) {
    return new Response("Forbidden", { status: 403 });
  }

  const restaurantIdParam = request.nextUrl.searchParams.get("restaurantId");
  const restaurantId =
    userRole === "SUPER_ADMIN" ? restaurantIdParam : session.user.restaurant_id;

  if (!restaurantId) {
    return new Response("restaurantId is required", { status: 400 });
  }

  // Kitchen sees confirmed (to start), preparing and ready orders;
  // waiter/admin see pending, confirmed and ready (to deliver) orders
  const statusFilter: OrderStatus[] =
    userRole === "KITCHEN"
      ? ["CONFIRMED", "PREPARING", "READY"]
      : ["PENDING", "CONFIRMED", "READY"];

  return sseResponse(request, {
    restaurantId,
    type: "order",
    loadRecord: (id) =>
      prisma.order.findFirst({
        where: { id, restaurant_id: restaurantId },
        include: orderInclude,
      }),
    loadList: () =>
      prisma.order.findMany({
        where: { status: { in: statusFilter }, restaurant_id: restaurantId },
        orderBy: { created_at: "desc" },
        include: orderInclude,
      }),
  });
}
