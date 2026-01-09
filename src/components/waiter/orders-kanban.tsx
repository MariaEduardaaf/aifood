"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import {
  ShoppingBag,
  Loader2,
  Clock,
  Check,
  X,
  Truck,
  Image as ImageIcon,
  AlertCircle,
  ChefHat,
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
}

type ColumnId = "PENDING" | "CONFIRMED" | "READY";

interface OrderCardProps {
  order: Order;
  seconds: number;
  isLoading: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
  onDeliver?: () => void;
  type: "pending" | "confirmed" | "ready";
}

function OrderCard({
  order,
  seconds,
  isLoading,
  onConfirm,
  onCancel,
  onDeliver,
  type,
}: OrderCardProps) {
  const t = useTranslations("waiter");
  const [expanded, setExpanded] = useState(false);

  const getUrgencyColor = (secs: number) => {
    if (secs >= 180) return "text-red-400";
    if (secs >= 60) return "text-yellow-400";
    return "text-green-400";
  };

  const getBorderColor = () => {
    switch (type) {
      case "pending":
        return "border-l-yellow-500";
      case "confirmed":
        return "border-l-blue-500";
      case "ready":
        return "border-l-green-500";
    }
  };

  return (
    <div
      className={cn(
        "card-premium rounded-xl overflow-hidden border-l-4 transition-all",
        getBorderColor(),
        type === "ready" && "ring-2 ring-green-500/30 bg-green-500/5"
      )}
    >
      {/* Header */}
      <div
        className="p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg">{order.table.label}</h3>
            <p className="text-sm text-muted-foreground">
              {order.items.length} {order.items.length === 1 ? "item" : "itens"} • R$ {Number(order.total).toFixed(2)}
            </p>
          </div>
          <div className="text-right">
            <div
              className={cn(
                "flex items-center gap-1 font-mono font-bold",
                getUrgencyColor(seconds)
              )}
            >
              <Clock className="h-4 w-4" />
              {formatTime(seconds)}
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Items */}
      {expanded && (
        <div className="px-4 pb-4 space-y-2 border-t border-border/30 pt-3">
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
                <span className="font-medium">Obs:</span> {order.notes}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="p-3 border-t border-border/30">
        {type === "pending" && (
          <div className="flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCancel?.();
              }}
              disabled={isLoading}
              className="flex-1 py-2.5 px-3 rounded-xl font-medium bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2 text-sm"
            >
              <X className="h-4 w-4" />
              {t("cancel")}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onConfirm?.();
              }}
              disabled={isLoading}
              className="flex-1 py-2.5 px-3 rounded-xl font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 text-sm"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  {t("confirm")}
                </>
              )}
            </button>
          </div>
        )}

        {type === "confirmed" && (
          <div className="flex items-center justify-center gap-2 py-2 text-blue-500">
            <ChefHat className="h-4 w-4" />
            <span className="text-sm font-medium">{t("waitingKitchen")}</span>
          </div>
        )}

        {type === "ready" && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeliver?.();
            }}
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-xl font-medium bg-green-500 hover:bg-green-600 text-white transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Truck className="h-5 w-5" />
                {t("deliver")}
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

export function OrdersKanban() {
  const t = useTranslations("waiter");
  const { playNotification, playSuccess } = useSound();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [timers, setTimers] = useState<Record<string, number>>({});

  const previousOrdersRef = useRef<string[]>([]);
  const previousReadyRef = useRef<string[]>([]);

  // Fetch orders with SSE
  useEffect(() => {
    const eventSource = new EventSource("/api/pedidos/stream");

    eventSource.onmessage = (event) => {
      try {
        const newOrders: Order[] = JSON.parse(event.data);

        // Check for new orders
        const currentIds = newOrders.map((o) => o.id);
        const previousIds = previousOrdersRef.current;
        const hasNewOrder = currentIds.some((id) => !previousIds.includes(id));

        // Check for new READY orders
        const readyIds = newOrders.filter((o) => o.status === "READY").map((o) => o.id);
        const previousReadyIds = previousReadyRef.current;
        const hasNewReady = readyIds.some((id) => !previousReadyIds.includes(id));

        if ((hasNewOrder || hasNewReady) && previousIds.length > 0) {
          playNotification();
        }

        previousOrdersRef.current = currentIds;
        previousReadyRef.current = readyIds;
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
        const createdAt = new Date(order.created_at).getTime();
        newTimers[order.id] = Math.floor((now - createdAt) / 1000);
      });

      setTimers(newTimers);
    }, 1000);

    return () => clearInterval(interval);
  }, [orders]);

  const handleConfirm = async (orderId: string) => {
    setActionLoading(orderId);
    try {
      const res = await fetch(`/api/pedidos/${orderId}/confirmar`, {
        method: "PATCH",
      });
      if (res.ok) {
        playSuccess();
      }
    } catch (err) {
      console.error("Error confirming order:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (orderId: string) => {
    if (!confirm(t("confirmCancelOrder"))) return;

    setActionLoading(orderId);
    try {
      const res = await fetch(`/api/pedidos/${orderId}/cancelar`, {
        method: "PATCH",
      });
      if (res.ok) {
        setOrders((prev) => prev.filter((o) => o.id !== orderId));
      }
    } catch (err) {
      console.error("Error cancelling order:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeliver = async (orderId: string) => {
    setActionLoading(orderId);
    try {
      const res = await fetch(`/api/pedidos/${orderId}/entregar`, {
        method: "PATCH",
      });
      if (res.ok) {
        playSuccess();
        setOrders((prev) => prev.filter((o) => o.id !== orderId));
      }
    } catch (err) {
      console.error("Error delivering order:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const pendingOrders = orders.filter((o) => o.status === "PENDING");
  const confirmedOrders = orders.filter((o) => o.status === "CONFIRMED");
  const readyOrders = orders.filter((o) => o.status === "READY");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalOrders = pendingOrders.length + confirmedOrders.length + readyOrders.length;

  if (totalOrders === 0) {
    return (
      <div className="card-premium rounded-2xl p-12 text-center">
        <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
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
        <div className={cn(
          "card-premium rounded-xl p-4 text-center relative",
          pendingOrders.length > 0 && "ring-2 ring-yellow-500/30"
        )}>
          <p className="text-2xl font-bold text-yellow-500">{pendingOrders.length}</p>
          <p className="text-xs text-muted-foreground">{t("pending")}</p>
          {pendingOrders.length > 0 && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full animate-pulse" />
          )}
        </div>
        <div className="card-premium rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-blue-500">{confirmedOrders.length}</p>
          <p className="text-xs text-muted-foreground">{t("confirmed")}</p>
        </div>
        <div className={cn(
          "card-premium rounded-xl p-4 text-center relative",
          readyOrders.length > 0 && "ring-2 ring-green-500/30"
        )}>
          <p className="text-2xl font-bold text-green-500">{readyOrders.length}</p>
          <p className="text-xs text-muted-foreground">{t("ready")}</p>
          {readyOrders.length > 0 && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
          )}
        </div>
      </div>

      {/* Kanban Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* PENDING */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <h3 className="font-bold">{t("pending")}</h3>
            <span className="text-sm text-muted-foreground">({pendingOrders.length})</span>
          </div>
          <div className="space-y-3 min-h-[200px]">
            {pendingOrders.length === 0 ? (
              <div className="card-premium rounded-xl p-6 text-center text-muted-foreground text-sm">
                Nenhum pedido pendente
              </div>
            ) : (
              pendingOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  seconds={timers[order.id] || 0}
                  isLoading={actionLoading === order.id}
                  onConfirm={() => handleConfirm(order.id)}
                  onCancel={() => handleCancel(order.id)}
                  type="pending"
                />
              ))
            )}
          </div>
        </div>

        {/* CONFIRMED (waiting kitchen) */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <h3 className="font-bold">{t("confirmed")}</h3>
            <span className="text-sm text-muted-foreground">({confirmedOrders.length})</span>
          </div>
          <div className="space-y-3 min-h-[200px]">
            {confirmedOrders.length === 0 ? (
              <div className="card-premium rounded-xl p-6 text-center text-muted-foreground text-sm">
                Nenhum pedido na cozinha
              </div>
            ) : (
              confirmedOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  seconds={timers[order.id] || 0}
                  isLoading={actionLoading === order.id}
                  type="confirmed"
                />
              ))
            )}
          </div>
        </div>

        {/* READY */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <h3 className="font-bold">{t("ready")}</h3>
            <span className="text-sm text-muted-foreground">({readyOrders.length})</span>
          </div>
          <div className="space-y-3 min-h-[200px]">
            {readyOrders.length === 0 ? (
              <div className="card-premium rounded-xl p-6 text-center text-muted-foreground text-sm">
                Nenhum pedido pronto
              </div>
            ) : (
              readyOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  seconds={timers[order.id] || 0}
                  isLoading={actionLoading === order.id}
                  onDeliver={() => handleDeliver(order.id)}
                  type="ready"
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
