import { EventEmitter } from "node:events";
import type { Prisma } from "@prisma/client";

// In-process realtime bus: order/call routes emit, SSE routes subscribe.
// ponytail: single instance only; move to Redis/Postgres pub/sub when running
// more than one server process.
export type RealtimeEvent = {
  type: "order" | "call";
  action: "created" | "updated";
  id: string;
  status: string;
};

type Listener = (event: RealtimeEvent) => void;

// Kept on globalThis so every route bundle (and dev hot reloads) share one bus
const g = globalThis as unknown as { realtimeBus?: EventEmitter };
const bus = (g.realtimeBus ??= new EventEmitter().setMaxListeners(0));

export function emit(restaurantId: string, event: RealtimeEvent) {
  bus.emit(restaurantId, event);
}

export function subscribe(restaurantId: string, listener: Listener) {
  bus.on(restaurantId, listener);
  return () => {
    bus.off(restaurantId, listener);
  };
}

// Record shapes sent by the SSE streams (and returned by staff routes)
export const orderInclude = {
  table: { select: { id: true, label: true } },
  items: {
    include: {
      menuItem: { select: { id: true, names: true, image_url: true } },
    },
  },
  preparer: { select: { id: true, name: true } },
  confirmer: { select: { id: true, name: true } },
} satisfies Prisma.OrderInclude;

export const callInclude = {
  table: { select: { id: true, label: true } },
  resolver: { select: { id: true, name: true } },
} satisfies Prisma.CallInclude;
