"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCorners,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
} from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
import {
  ChefHat,
  Loader2,
  Clock,
  Check,
  GripVertical,
} from "lucide-react";
import { cn, formatTime } from "@/lib/utils";
import { localizedText } from "@/lib/i18n/text";
import { useSound } from "@/components/providers/sound-provider";
import { useDefaultLocale } from "@/components/providers/currency";
import { useLiveRecords, ReconnectBanner } from "@/components/providers/use-event-stream";
import { useStaffAlert } from "@/components/providers/staff-alerts";
import { useToast } from "@/components/ui/toast";

interface OrderItem {
  id: string;
  quantity: number;
  unit_price: number;
  notes: string | null;
  menuItem: {
    id: string;
    names: Record<string, string>;
    image_url: string | null;
  };
}

interface Order {
  id: string;
  status: "PENDING" | "CONFIRMED" | "PREPARING" | "READY" | "DELIVERED" | "CANCELLED";
  total: number;
  notes: string | null;
  created_at: string;
  confirmed_at: string | null;
  preparing_at: string | null;
  ready_at: string | null;
  table: {
    id: string;
    label: string;
  };
  items: OrderItem[];
  preparer?: {
    id: string;
    name: string;
  } | null;
}

type ColumnId = "CONFIRMED" | "PREPARING" | "READY";

const COLUMNS: Record<ColumnId, { title: string; color: string }> = {
  CONFIRMED: { title: "newOrders", color: "yellow" },
  PREPARING: { title: "preparing", color: "orange" },
  READY: { title: "ready", color: "green" },
};

// Valid transitions for drag and drop
const VALID_TRANSITIONS: Record<string, ColumnId[]> = {
  CONFIRMED: ["PREPARING"],
  PREPARING: ["READY"],
  READY: [], // Cannot drag from READY
};

interface DroppableColumnProps {
  id: ColumnId;
  children: React.ReactNode;
  orderCount: number;
}

function DroppableColumn({ id, children, orderCount }: DroppableColumnProps) {
  const t = useTranslations("kitchen");
  const { isOver, setNodeRef } = useDroppable({ id });
  const column = COLUMNS[id];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "w-3 h-3 rounded-full",
            column.color === "yellow" && "bg-yellow-500",
            column.color === "orange" && "bg-orange-500",
            column.color === "green" && "bg-green-500"
          )}
        />
        <h3 className="font-bold">{t(column.title)}</h3>
        <span className="text-sm text-muted-foreground">({orderCount})</span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "space-y-3 min-h-[200px] p-2 rounded-xl transition-colors",
          isOver && "bg-primary/10 ring-2 ring-primary/30"
        )}
      >
        {children}
      </div>
    </div>
  );
}

interface DraggableOrderCardProps {
  order: Order;
  seconds: number;
  isLoading: boolean;
  onAction: () => void;
  type: "confirmed" | "preparing" | "ready";
}

function DraggableOrderCard({
  order,
  seconds,
  isLoading,
  onAction,
  type,
}: DraggableOrderCardProps) {
  const t = useTranslations("kitchen");
  const locale = useLocale();
  const defaultLocale = useDefaultLocale();
  const canDrag = type !== "ready";

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: order.id,
    disabled: !canDrag,
    data: { order, currentStatus: order.status },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: isDragging ? 50 : undefined,
      }
    : undefined;

  const getUrgencyColor = (secs: number) => {
    if (secs >= 600) return "text-red-700 dark:text-red-300";
    if (secs >= 300) return "text-amber-800 dark:text-amber-300";
    return "text-green-800 dark:text-green-300";
  };

  const getUrgencyBorder = (secs: number) => {
    if (secs >= 600) return "border-red-500/50";
    if (secs >= 300) return "border-yellow-500/50";
    return "border-green-500/50";
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "card-premium rounded-xl overflow-hidden border-l-4 transition-all",
        getUrgencyBorder(seconds),
        isDragging && "opacity-50 shadow-2xl scale-105"
      )}
    >
      {/* Header with drag handle */}
      <div className="p-4 border-b border-border/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {canDrag && (
              <div
                {...attributes}
                {...listeners}
                aria-label={t("dragHandle", { table: order.table.label })}
                className="cursor-grab active:cursor-grabbing p-1 -ml-1 rounded hover:bg-secondary/50 touch-none"
              >
                <GripVertical className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
            <h3 className="font-bold text-2xl">{order.table.label}</h3>
          </div>
          <div
            className={cn(
              "flex items-center gap-1 font-bold tabular-nums text-sm",
              getUrgencyColor(seconds)
            )}
          >
            <Clock className="h-4 w-4" />
            {formatTime(seconds)}
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="p-4 space-y-2">
        {order.items.map((item) => (
          <div key={item.id} className="flex items-start gap-3">
            <span className="w-9 shrink-0 text-lg font-bold tabular-nums text-price">{item.quantity}×</span>
            <div className="flex-1">
              <p className="font-medium text-lg">
                {localizedText(item.menuItem.names, locale, defaultLocale)}
              </p>
              {item.notes && (
                <p className="mt-1 inline-block rounded-md bg-amber-200 px-2 py-1 text-base font-semibold text-amber-950">{item.notes}</p>
              )}
            </div>
          </div>
        ))}

        {order.notes && (
          <div className="pt-2 mt-2 border-t border-border/30">
            <p className="rounded-md bg-amber-200 px-3 py-2 text-base font-semibold text-amber-950">
              <span className="font-medium">{t("notes")}:</span> {order.notes}
            </p>
          </div>
        )}
      </div>

      {/* Action Button */}
      {type !== "ready" && (
        <div className="p-3 border-t border-border/30">
          {type === "confirmed" ? (
            <button
              onClick={onAction}
              disabled={isLoading}
              className="w-full min-h-[44px] py-3 px-4 rounded-xl font-medium bg-orange-700 hover:bg-orange-800 text-white transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <ChefHat className="h-5 w-5" />
                  {t("startPreparing")}
                </>
              )}
            </button>
          ) : (
            <button
              onClick={onAction}
              disabled={isLoading}
              className="w-full min-h-[44px] py-3 px-4 rounded-xl font-medium bg-green-700 hover:bg-green-800 text-white transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Check className="h-5 w-5" />
                  {t("markReady")}
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Ready indicator */}
      {type === "ready" && (
        <div className="p-3 border-t border-border/30 bg-green-500/10">
          <p className="text-center text-green-800 dark:text-green-300 font-medium text-sm">
            {t("waitingPickup")}
          </p>
        </div>
      )}
    </div>
  );
}

export function KitchenKanban() {
  const t = useTranslations("kitchen");
  const tErr = useTranslations("errors");
  const { playSuccess } = useSound();
  const alert = useStaffAlert();
  const toast = useToast();

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const { records: orders, loading, lost } = useLiveRecords<Order>({
    streamUrl: "/api/orders/stream",
    event: "order",
    keep: (o) => o.status === "CONFIRMED" || o.status === "PREPARING" || o.status === "READY",
    sort: (a, b) => b.created_at.localeCompare(a.created_at),
    // A confirmed order is a new ticket for the kitchen
    onChange: (order) => {
      if (order.status === "CONFIRMED") alert();
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    })
  );

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Confirmed orders count from confirmation, preparing ones from the start
  const timers: Record<string, number> = {};
  for (const order of orders) {
    const start =
      order.status === "PREPARING" && order.preparing_at
        ? order.preparing_at
        : order.confirmed_at ?? order.created_at;
    timers[order.id] = Math.max(0, Math.floor((now - new Date(start).getTime()) / 1000));
  }

  const runAction = async (orderId: string, action: "prepare" | "ready") => {
    setActionLoading(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}/${action}`, { method: "PATCH" });
      if (res.ok) {
        playSuccess();
      } else {
        toast(tErr("generic"), "error");
      }
    } catch {
      toast(tErr("generic"), "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleStartPreparing = (orderId: string) => runAction(orderId, "prepare");
  const handleMarkReady = (orderId: string) => runAction(orderId, "ready");

  const handleDragStart = (event: DragStartEvent) => {
    const order = orders.find((o) => o.id === event.active.id);
    setActiveOrder(order || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveOrder(null);

    if (!over) return;

    const orderId = active.id as string;
    const newStatus = over.id as ColumnId;
    const order = orders.find((o) => o.id === orderId);

    if (!order || order.status === newStatus) return;

    // Validate transition
    const validTargets = VALID_TRANSITIONS[order.status] || [];
    if (!validTargets.includes(newStatus)) return;

    // Execute the action
    if (newStatus === "PREPARING") {
      handleStartPreparing(orderId);
    } else if (newStatus === "READY") {
      handleMarkReady(orderId);
    }
  };

  const confirmedOrders = orders.filter((o) => o.status === "CONFIRMED");
  const preparingOrders = orders.filter((o) => o.status === "PREPARING");
  const readyOrders = orders.filter((o) => o.status === "READY");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalOrders = confirmedOrders.length + preparingOrders.length + readyOrders.length;

  if (totalOrders === 0) {
    return (
      <div className="card-premium rounded-2xl p-12 text-center">
        <ReconnectBanner show={lost} />
        <ChefHat className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">
          {t("noOrders")}
        </h3>
        <p className="text-muted-foreground">{t("noOrdersMessage")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ReconnectBanner show={lost} />
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card-premium rounded-xl p-4 text-center">
          <p className="text-2xl font-bold tabular-nums text-amber-800 dark:text-amber-300">{confirmedOrders.length}</p>
          <p className="text-xs text-muted-foreground">{t("newOrders")}</p>
        </div>
        <div className="card-premium rounded-xl p-4 text-center">
          <p className="text-2xl font-bold tabular-nums text-orange-800 dark:text-orange-300">{preparingOrders.length}</p>
          <p className="text-xs text-muted-foreground">{t("preparing")}</p>
        </div>
        <div className="card-premium rounded-xl p-4 text-center">
          <p className="text-2xl font-bold tabular-nums text-green-800 dark:text-green-300">{readyOrders.length}</p>
          <p className="text-xs text-muted-foreground">{t("ready")}</p>
        </div>
      </div>

      {/* Kanban with DnD */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* CONFIRMED */}
          <DroppableColumn id="CONFIRMED" orderCount={confirmedOrders.length}>
            {confirmedOrders.length === 0 ? (
              <div className="card-premium rounded-xl p-6 text-center text-muted-foreground text-sm">
                {t("noNewOrders")}
              </div>
            ) : (
              confirmedOrders.map((order) => (
                <DraggableOrderCard
                  key={order.id}
                  order={order}
                  seconds={timers[order.id] || 0}
                  isLoading={actionLoading === order.id}
                  onAction={() => handleStartPreparing(order.id)}
                  type="confirmed"
                />
              ))
            )}
          </DroppableColumn>

          {/* PREPARING */}
          <DroppableColumn id="PREPARING" orderCount={preparingOrders.length}>
            {preparingOrders.length === 0 ? (
              <div className="card-premium rounded-xl p-6 text-center text-muted-foreground text-sm">
                {t("noPreparing")}
              </div>
            ) : (
              preparingOrders.map((order) => (
                <DraggableOrderCard
                  key={order.id}
                  order={order}
                  seconds={timers[order.id] || 0}
                  isLoading={actionLoading === order.id}
                  onAction={() => handleMarkReady(order.id)}
                  type="preparing"
                />
              ))
            )}
          </DroppableColumn>

          {/* READY */}
          <DroppableColumn id="READY" orderCount={readyOrders.length}>
            {readyOrders.length === 0 ? (
              <div className="card-premium rounded-xl p-6 text-center text-muted-foreground text-sm">
                {t("noReady")}
              </div>
            ) : (
              readyOrders.map((order) => (
                <DraggableOrderCard
                  key={order.id}
                  order={order}
                  seconds={timers[order.id] || 0}
                  isLoading={actionLoading === order.id}
                  onAction={() => {}}
                  type="ready"
                />
              ))
            )}
          </DroppableColumn>
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeOrder && (
            <div className="card-premium rounded-xl p-4 shadow-2xl opacity-90">
              <h3 className="font-bold text-lg">{activeOrder.table.label}</h3>
              <p className="text-sm text-muted-foreground">
                {t("itemCount", { count: activeOrder.items.length })}
              </p>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
