"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
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
  Image as ImageIcon,
  GripVertical,
} from "lucide-react";
import { cn, formatTime } from "@/lib/utils";
import { useSound } from "@/components/providers/sound-provider";

interface OrderItem {
  id: string;
  quantity: number;
  unit_price: number;
  notes: string | null;
  menuItem: {
    id: string;
    name_pt: string;
    name_es: string;
    name_en: string;
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
    if (secs >= 600) return "text-red-400";
    if (secs >= 300) return "text-yellow-400";
    return "text-green-400";
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
                className="cursor-grab active:cursor-grabbing p-1 -ml-1 rounded hover:bg-secondary/50 touch-none"
              >
                <GripVertical className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
            <h3 className="font-bold text-lg">{order.table.label}</h3>
          </div>
          <div
            className={cn(
              "flex items-center gap-1 font-mono font-bold text-sm",
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
          <div key={item.id} className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-secondary flex-shrink-0 overflow-hidden">
              {item.menuItem.image_url ? (
                <img
                  src={item.menuItem.image_url}
                  alt={item.menuItem.name_pt}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="h-3 w-3 text-muted-foreground/30" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">
                <span className="text-primary font-bold">{item.quantity}x</span>{" "}
                {item.menuItem.name_pt}
              </p>
              {item.notes && (
                <p className="text-xs text-yellow-500">{item.notes}</p>
              )}
            </div>
          </div>
        ))}

        {order.notes && (
          <div className="pt-2 mt-2 border-t border-border/30">
            <p className="text-sm text-yellow-500">
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
              className="w-full py-3 px-4 rounded-xl font-medium bg-orange-500 hover:bg-orange-600 text-white transition-colors flex items-center justify-center gap-2"
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
              className="w-full py-3 px-4 rounded-xl font-medium bg-green-500 hover:bg-green-600 text-white transition-colors flex items-center justify-center gap-2"
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
          <p className="text-center text-green-500 font-medium text-sm">
            {t("waitingPickup")}
          </p>
        </div>
      )}
    </div>
  );
}

export function KitchenKanban() {
  const t = useTranslations("kitchen");
  const { playNotification, playSuccess } = useSound();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [timers, setTimers] = useState<Record<string, number>>({});
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);

  const previousOrdersRef = useRef<string[]>([]);

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

  // Fetch orders with SSE
  useEffect(() => {
    const eventSource = new EventSource("/api/pedidos/stream");

    eventSource.onmessage = (event) => {
      try {
        const newOrders: Order[] = JSON.parse(event.data);

        const confirmedIds = newOrders
          .filter((o) => o.status === "CONFIRMED")
          .map((o) => o.id);
        const previousConfirmedIds = previousOrdersRef.current;
        const hasNewOrder = confirmedIds.some(
          (id) => !previousConfirmedIds.includes(id)
        );

        if (hasNewOrder && previousConfirmedIds.length > 0) {
          playNotification();
        }

        previousOrdersRef.current = confirmedIds;
        setOrders(newOrders);
        setLoading(false);
      } catch (err) {
        console.error("Error parsing SSE data:", err);
      }
    };

    eventSource.onerror = () => {
      console.error("SSE connection error");
    };

    return () => {
      eventSource.close();
    };
  }, [playNotification]);

  // Update timers
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const newTimers: Record<string, number> = {};

      orders.forEach((order) => {
        let startTime: number;
        if (order.status === "PREPARING" && order.preparing_at) {
          startTime = new Date(order.preparing_at).getTime();
        } else if (order.confirmed_at) {
          startTime = new Date(order.confirmed_at).getTime();
        } else {
          startTime = new Date(order.created_at).getTime();
        }
        newTimers[order.id] = Math.floor((now - startTime) / 1000);
      });

      setTimers(newTimers);
    }, 1000);

    return () => clearInterval(interval);
  }, [orders]);

  const handleStartPreparing = async (orderId: string) => {
    setActionLoading(orderId);
    try {
      const res = await fetch(`/api/pedidos/${orderId}/preparar`, {
        method: "PATCH",
      });
      if (res.ok) {
        playSuccess();
      }
    } catch (err) {
      console.error("Error starting preparation:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkReady = async (orderId: string) => {
    setActionLoading(orderId);
    try {
      const res = await fetch(`/api/pedidos/${orderId}/pronto`, {
        method: "PATCH",
      });
      if (res.ok) {
        playSuccess();
      }
    } catch (err) {
      console.error("Error marking as ready:", err);
    } finally {
      setActionLoading(null);
    }
  };

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
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card-premium rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-yellow-500">{confirmedOrders.length}</p>
          <p className="text-xs text-muted-foreground">{t("newOrders")}</p>
        </div>
        <div className="card-premium rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-orange-500">{preparingOrders.length}</p>
          <p className="text-xs text-muted-foreground">{t("preparing")}</p>
        </div>
        <div className="card-premium rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-500">{readyOrders.length}</p>
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
                {activeOrder.items.length} itens
              </p>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
