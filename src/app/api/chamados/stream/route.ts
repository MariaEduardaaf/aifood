import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/chamados/stream - Server-Sent Events for real-time updates
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

  const { searchParams } = new URL(request.url);
  const restaurantIdParam = searchParams.get("restaurantId");
  const restaurantId =
    session.user.role === "SUPER_ADMIN"
      ? restaurantIdParam
      : session.user.restaurant_id;

  if (!restaurantId) {
    return new Response("restaurantId is required", { status: 400 });
  }

  const encoder = new TextEncoder();
  let isConnected = true;

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial data
      const sendCalls = async () => {
        if (!isConnected) return;

        try {
          const calls = await prisma.call.findMany({
            where: {
              status: "OPEN",
              restaurant_id: restaurantId,
            },
            orderBy: { created_at: "asc" },
            include: {
              table: {
                select: {
                  id: true,
                  label: true,
                },
              },
            },
          });

          const data = `data: ${JSON.stringify(calls)}\n\n`;
          controller.enqueue(encoder.encode(data));
        } catch (error) {
          console.error("SSE error:", error);
        }
      };

      // Send initial data
      await sendCalls();

      // Poll for updates every 2 seconds (simple approach for MVP)
      const interval = setInterval(async () => {
        if (!isConnected) {
          clearInterval(interval);
          return;
        }
        await sendCalls();
      }, 2000);

      // Handle client disconnect
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
