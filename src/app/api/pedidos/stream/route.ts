import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { OrderStatus } from "@prisma/client";

// GET /api/pedidos/stream - Server-Sent Events para pedidos em tempo real
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

  const { searchParams } = new URL(request.url);
  const restaurantIdParam = searchParams.get("restaurantId");
  const restaurantId =
    userRole === "SUPER_ADMIN" ? restaurantIdParam : session.user.restaurant_id;

  if (!restaurantId) {
    return new Response("restaurantId is required", { status: 400 });
  }

  // Definir quais status cada role pode ver
  let statusFilter: OrderStatus[];

  if (userRole === "KITCHEN") {
    // Cozinha vê: pedidos confirmados (para iniciar), preparando, e prontos
    statusFilter = ["CONFIRMED", "PREPARING", "READY"];
  } else {
    // Garçom/Admin vê: pendentes, confirmados, e prontos (para entregar)
    statusFilter = ["PENDING", "CONFIRMED", "READY"];
  }

  const encoder = new TextEncoder();
  let isConnected = true;

  const stream = new ReadableStream({
    async start(controller) {
      const sendOrders = async () => {
        if (!isConnected) return;

        try {
          const orders = await prisma.order.findMany({
            where: {
              status: {
                in: statusFilter,
              },
              restaurant_id: restaurantId,
            },
            orderBy: { created_at: "desc" },
            include: {
              table: {
                select: {
                  id: true,
                  label: true,
                },
              },
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
              preparer: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          });

          const data = `data: ${JSON.stringify(orders)}\n\n`;
          controller.enqueue(encoder.encode(data));
        } catch (error) {
          console.error("SSE error:", error);
        }
      };

      // Enviar dados iniciais
      await sendOrders();

      // Poll a cada 2 segundos
      const interval = setInterval(async () => {
        if (!isConnected) {
          clearInterval(interval);
          return;
        }
        await sendOrders();
      }, 2000);

      // Handle desconexao do cliente
      request.signal.addEventListener("abort", () => {
        isConnected = false;
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
