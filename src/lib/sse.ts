import { subscribe, type RealtimeEvent } from "@/lib/events";

const HEARTBEAT_MS = 25_000;
const REFRESH_MS = 30_000;
// Streams end after this; EventSource reconnects on its own (retry: 3000),
// which also re-runs auth for long-lived screens
const MAX_LIFETIME_MS = 5 * 60_000;
// Unread events queued for a client before it is treated as stalled
const MAX_QUEUED_CHUNKS = 64;

// Open streams' close functions, on globalThis so every route bundle shares
// one set and a shutdown reaches all of them
const g = globalThis as unknown as {
  sseClosers?: Set<() => void>;
  sseSignalsHooked?: boolean;
};
const closers = (g.sseClosers ??= new Set());

// Ends every open stream with `event: bye`, so clients reconnect quietly
export function closeAll() {
  closers.forEach((close) => close());
}

// Next's own SIGTERM/SIGINT handler waits for open connections before it
// exits, and SSE connections would hold a deploy for up to MAX_LIFETIME_MS
if (!g.sseSignalsHooked) {
  g.sseSignalsHooked = true;
  for (const signal of ["SIGTERM", "SIGINT"] as const) {
    process.once(signal, () => {
      closeAll();
      // Listening disables Node's default exit; keep it when nothing else
      // handles the signal (e.g. NEXT_MANUAL_SIG_HANDLE)
      if (process.listenerCount(signal) === 0) process.exit(0);
    });
  }
}

// Server-Sent Events stream for one restaurant:
//   event: refresh  data: full list (on connect and every 30s, safety net)
//   event: <type>   data: the changed record, pushed from the event bus
//   event: bye      data: {}, sent right before the server ends the stream
//                   (lifetime reached or shutdown); the client reconnects
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
  let close: (bye?: boolean) => void = () => {};

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
      const lifetime = setTimeout(() => close(true), MAX_LIFETIME_MS);
      const closeWithBye = () => close(true);

      close = (bye = false) => {
        if (closed) return;
        if (bye) sendEvent("bye", {});
        closed = true;
        closers.delete(closeWithBye);
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
      closers.add(closeWithBye);
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
