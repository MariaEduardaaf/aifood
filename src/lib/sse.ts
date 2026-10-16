import { subscribe, type RealtimeEvent } from "@/lib/events";

const HEARTBEAT_MS = 25_000;
const REFRESH_MS = 30_000;
// Streams end after this; EventSource reconnects on its own (retry: 3000),
// which also re-runs auth for long-lived screens
const MAX_LIFETIME_MS = 5 * 60_000;
// Unread events queued for a client before it is treated as stalled
const MAX_QUEUED_CHUNKS = 64;

// Server-Sent Events stream for one restaurant:
//   event: refresh  data: full list (on connect and every 30s, safety net)
//   event: <type>   data: the changed record, pushed from the event bus
//   : heartbeat     comment every 25s so proxies keep the connection open
export function sseResponse(
  request: Request,
  opts: {
    restaurantId: string;
    type: RealtimeEvent["type"];
    loadRecord: (id: string) => Promise<unknown>;
    loadList: () => Promise<unknown>;
  },
) {
  const encoder = new TextEncoder();
  let close = () => {};

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      // Serialises record loads so updates reach the client in emit order
      let queue = Promise.resolve();

      const send = (chunk: string) => {
        if (closed) return;
        // Client stopped reading: drop it instead of buffering without limit
        if ((controller.desiredSize ?? 1) <= 0) {
          close();
          return;
        }
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          close();
        }
      };
      const sendEvent = (event: string, data: unknown) =>
        send(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

      const refresh = () => {
        queue = queue.then(async () => {
          try {
            sendEvent("refresh", await opts.loadList());
          } catch (error) {
            console.error("SSE refresh error:", error);
          }
        });
      };

      const unsubscribe = subscribe(opts.restaurantId, (event) => {
        if (event.type !== opts.type) return;
        queue = queue.then(async () => {
          try {
            const record = await opts.loadRecord(event.id);
            if (record) sendEvent(opts.type, record);
          } catch (error) {
            console.error("SSE event error:", error);
          }
        });
      });

      const heartbeat = setInterval(() => send(": heartbeat\n\n"), HEARTBEAT_MS);
      const poll = setInterval(refresh, REFRESH_MS);
      const lifetime = setTimeout(() => close(), MAX_LIFETIME_MS);

      close = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        clearInterval(poll);
        clearTimeout(lifetime);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // already closed by the runtime
        }
      };

      request.signal.addEventListener("abort", () => close());
      // Aborted while auth ran: the listener above would never fire
      if (request.signal.aborted) {
        close();
        return;
      }
      send("retry: 3000\n\n");
      refresh();
    },
    cancel() {
      close();
    },
  }, new CountQueuingStrategy({ highWaterMark: MAX_QUEUED_CHUNKS }));

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      // no-transform keeps compression middleware from buffering the stream
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
