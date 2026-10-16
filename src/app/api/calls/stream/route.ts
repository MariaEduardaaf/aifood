import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { callInclude } from "@/lib/events";
import { sseResponse } from "@/lib/sse";

export const dynamic = "force-dynamic";

// GET /api/calls/stream - Server-Sent Events for real-time calls.
// `refresh` carries the open calls; `call` carries any created or resolved call.
export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (
    session.user.role !== "WAITER" &&
    session.user.role !== "ADMIN" &&
    session.user.role !== "MANAGER" &&
    session.user.role !== "SUPER_ADMIN"
  ) {
    return new Response("Forbidden", { status: 403 });
  }

  const restaurantIdParam = request.nextUrl.searchParams.get("restaurantId");
  const restaurantId =
    session.user.role === "SUPER_ADMIN"
      ? restaurantIdParam
      : session.user.restaurant_id;

  if (!restaurantId) {
    return new Response("restaurantId is required", { status: 400 });
  }

  return sseResponse(request, {
    restaurantId,
    type: "call",
    loadRecord: (id) =>
      prisma.call.findFirst({
        where: { id, restaurant_id: restaurantId },
        include: callInclude,
      }),
    loadList: () =>
      prisma.call.findMany({
        where: { status: "OPEN", restaurant_id: restaurantId },
        orderBy: { created_at: "asc" },
        include: callInclude,
      }),
  });
}
