import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/pedidos/stream - Server-Sent Events para pedidos em tempo real
export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session) {
    return new Response("Unauthorized", { status: 401 });
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
                in: ["PENDING", "CONFIRMED"],
              },
            },
            orderBy: { created_at: "asc" },
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
