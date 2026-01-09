"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  ChefHat,
  Loader2,
  Clock,
  Check,
  Image as ImageIcon,
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
  status:
    | "PENDING"
    | "CONFIRMED"
    | "PREPARING"
    | "READY"
    | "DELIVERED"
    | "CANCELLED";
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

export function KitchenPanel() {
  const t = useTranslations("kitchen");
  const { playNotification } = useSound();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [timers, setTimers] = useState<Record<string, number>>({});

  const previousOrdersRef = useRef<string[]>([]);

  // Fetch orders with SSE
  useEffect(() => {
    const eventSource = new EventSource("/api/pedidos/stream");

    eventSource.onmessage = (event) => {
      try {
        const newOrders: Order[] = JSON.parse(event.data);

        // Check for new CONFIRMED orders (new orders for kitchen)
        const confirmedIds = newOrders
          .filter((o) => o.status === "CONFIRMED")
          .map((o) => o.id);
        const previousConfirmedIds = previousOrdersRef.current;
        const hasNewOrder = confirmedIds.some(
          (id) => !previousConfirmedIds.includes(id),
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

  // Update timers every second
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const newTimers: Record<string, number> = {};

      orders.forEach((order) => {
        // For CONFIRMED, count from confirmed_at; for PREPARING, count from preparing_at
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
      if (!res.ok) {
        console.error("Error starting preparation");
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
      if (!res.ok) {
        console.error("Error marking as ready");
      }
    } catch (err) {
      console.error("Error marking as ready:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const getUrgencyColor = (seconds: number) => {
    if (seconds >= 600) return "text-red-400"; // > 10 min
    if (seconds >= 300) return "text-yellow-400"; // > 5 min
    return "text-green-400";
  };

  const getUrgencyBorder = (seconds: number) => {
    if (seconds >= 600) return "border-red-500/50";
    if (seconds >= 300) return "border-yellow-500/50";
    return "border-green-500/50";
  };

  // Separate orders by status
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

  const renderOrderCard = (
    order: Order,
    type: "confirmed" | "preparing" | "ready",
  ) => {
    const seconds = timers[order.id] || 0;
    const isLoading = actionLoading === order.id;

    return (
      <div
        key={order.id}
        className={cn(
          "card-premium rounded-xl overflow-hidden border-l-4 transition-all",
          getUrgencyBorder(seconds),
        )}
      >
        {/* Header */}
        <div className="p-4 border-b border-border/30">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg">{order.table.label}</h3>
            <div
              className={cn(
                "flex items-center gap-1 font-mono font-bold text-sm",
                getUrgencyColor(seconds),
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
                  <span className="text-primary font-bold">
                    {item.quantity}x
                  </span>{" "}
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
                onClick={() => handleStartPreparing(order.id)}
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
                onClick={() => handleMarkReady(order.id)}
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
  };

  const totalOrders =
    confirmedOrders.length + preparingOrders.length + readyOrders.length;

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
        <div
          className={cn(
            "card-premium rounded-xl p-4 text-center relative",
            confirmedOrders.length > 0 &&
              "ring-2 ring-yellow-500/50 animate-pulse",
          )}
        >
          <p className="text-2xl font-bold text-yellow-500">
            {confirmedOrders.length}
          </p>
          <p className="text-xs text-muted-foreground">{t("newOrders")}</p>
          {confirmedOrders.length > 0 && (
            <span className="absolute -top-2 -right-2 min-w-[24px] h-6 px-1.5 flex items-center justify-center bg-yellow-500 text-white text-xs font-bold rounded-full animate-bounce">
              {confirmedOrders.length}
            </span>
          )}
        </div>
        <div
          className={cn(
            "card-premium rounded-xl p-4 text-center relative",
            preparingOrders.length > 0 && "ring-2 ring-orange-500/50",
          )}
        >
          <p className="text-2xl font-bold text-orange-500">
            {preparingOrders.length}
          </p>
          <p className="text-xs text-muted-foreground">{t("preparing")}</p>
        </div>
        <div
          className={cn(
            "card-premium rounded-xl p-4 text-center relative",
            readyOrders.length > 0 && "ring-2 ring-green-500/50 animate-pulse",
          )}
        >
          <p className="text-2xl font-bold text-green-500">
            {readyOrders.length}
          </p>
          <p className="text-xs text-muted-foreground">{t("ready")}</p>
          {readyOrders.length > 0 && (
            <span className="absolute -top-2 -right-2 min-w-[24px] h-6 px-1.5 flex items-center justify-center bg-green-500 text-white text-xs font-bold rounded-full animate-bounce">
              {readyOrders.length}
            </span>
          )}
        </div>
      </div>

      {/* Kanban Columns - Mobile: Stacked, Desktop: Side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* New Orders (CONFIRMED) */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <h3 className="font-bold">{t("newOrders")}</h3>
            <span className="text-sm text-muted-foreground">
              ({confirmedOrders.length})
            </span>
          </div>
          <div className="space-y-3">
            {confirmedOrders.length === 0 ? (
              <div className="card-premium rounded-xl p-6 text-center text-muted-foreground text-sm">
                {t("noNewOrders")}
              </div>
            ) : (
              confirmedOrders.map((order) =>
                renderOrderCard(order, "confirmed"),
              )
            )}
          </div>
        </div>

        {/* Preparing */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500" />
            <h3 className="font-bold">{t("preparing")}</h3>
            <span className="text-sm text-muted-foreground">
              ({preparingOrders.length})
            </span>
          </div>
          <div className="space-y-3">
            {preparingOrders.length === 0 ? (
              <div className="card-premium rounded-xl p-6 text-center text-muted-foreground text-sm">
                {t("noPreparing")}
              </div>
            ) : (
              preparingOrders.map((order) =>
                renderOrderCard(order, "preparing"),
              )
            )}
          </div>
        </div>

        {/* Ready */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <h3 className="font-bold">{t("ready")}</h3>
            <span className="text-sm text-muted-foreground">
              ({readyOrders.length})
            </span>
          </div>
          <div className="space-y-3">
            {readyOrders.length === 0 ? (
              <div className="card-premium rounded-xl p-6 text-center text-muted-foreground text-sm">
                {t("noReady")}
              </div>
            ) : (
              readyOrders.map((order) => renderOrderCard(order, "ready"))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
