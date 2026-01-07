"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  ShoppingBag,
  Check,
  Loader2,
  Clock,
  ChevronDown,
  ChevronUp,
  X,
  Truck,
  Image as ImageIcon,
} from "lucide-react";
import { cn, formatTime, getUrgencyClass } from "@/lib/utils";

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
  table: {
    id: string;
    label: string;
  };
  items: OrderItem[];
}

export function OrdersPanel() {
  const t = useTranslations("waiter");

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [timers, setTimers] = useState<Record<string, number>>({});

  const previousOrdersRef = useRef<string[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio
  useEffect(() => {
    audioRef.current = new Audio("/notification.mp3");
    audioRef.current.volume = 0.5;
  }, []);

  // Play notification sound
  const playNotification = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  }, []);

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

        if (hasNewOrder && previousIds.length > 0) {
          playNotification();
        }

        previousOrdersRef.current = currentIds;
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
        const createdAt = new Date(order.created_at).getTime();
        newTimers[order.id] = Math.floor((now - createdAt) / 1000);
      });

      setTimers(newTimers);
    }, 1000);

    return () => clearInterval(interval);
  }, [orders]);

  const toggleExpanded = (orderId: string) => {
    setExpandedOrders((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  const handleConfirm = async (orderId: string) => {
    setActionLoading(orderId);
    try {
      const res = await fetch(`/api/pedidos/${orderId}/confirmar`, {
        method: "PATCH",
      });
      if (!res.ok) {
        console.error("Error confirming order");
      }
    } catch (err) {
      console.error("Error confirming order:", err);
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
        // Remove from list (will be updated via SSE)
        setOrders((prev) => prev.filter((o) => o.id !== orderId));
      }
    } catch (err) {
      console.error("Error delivering order:", err);
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

  const pendingOrders = orders.filter((o) => o.status === "PENDING");
  const confirmedOrders = orders.filter((o) => o.status === "CONFIRMED");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShoppingBag className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-bold">{t("orders")}</h2>
        </div>
        <div className="flex items-center gap-2">
          {pendingOrders.length > 0 && (
            <span className="px-3 py-1 bg-yellow-500/20 text-yellow-500 rounded-full text-sm font-medium">
              {pendingOrders.length} {t("pending")}
            </span>
          )}
          {confirmedOrders.length > 0 && (
            <span className="px-3 py-1 bg-blue-500/20 text-blue-500 rounded-full text-sm font-medium">
              {confirmedOrders.length} {t("confirmed")}
            </span>
          )}
        </div>
      </div>

      {/* Orders List */}
      {orders.length === 0 ? (
        <div className="card-premium rounded-2xl p-12 text-center">
          <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {t("noOrders")}
          </h3>
          <p className="text-muted-foreground">{t("noOrdersMessage")}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const seconds = timers[order.id] || 0;
            const urgencyClass = getUrgencyClass(seconds);
            const isExpanded = expandedOrders.has(order.id);
            const isLoading = actionLoading === order.id;
            const isPending = order.status === "PENDING";

            return (
              <div
                key={order.id}
                className={cn(
                  "card-premium rounded-2xl overflow-hidden transition-all duration-300",
                  urgencyClass,
                  isPending && seconds >= 180 && "pulse-gold"
                )}
              >
                {/* Order Header */}
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => toggleExpanded(order.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {/* Status Badge */}
                      <div
                        className={cn(
                          "px-3 py-1 rounded-full text-sm font-medium",
                          isPending
                            ? "bg-yellow-500/20 text-yellow-500"
                            : "bg-blue-500/20 text-blue-500"
                        )}
                      >
                        {isPending ? t("pending") : t("confirmed")}
                      </div>

                      {/* Table */}
                      <div>
                        <h3 className="font-bold text-lg">{order.table.label}</h3>
                        <p className="text-sm text-muted-foreground">
                          {order.items.length} {order.items.length === 1 ? "item" : "itens"} • R$ {Number(order.total).toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Timer */}
                      <div className="text-right">
                        <div
                          className={cn(
                            "flex items-center gap-1 font-mono font-bold",
                            seconds >= 180
                              ? "text-red-400"
                              : seconds >= 60
                                ? "text-yellow-400"
                                : "text-green-400"
                          )}
                        >
                          <Clock className="h-4 w-4" />
                          {formatTime(seconds)}
                        </div>
                      </div>

                      {/* Expand Icon */}
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-border/50">
                    {/* Items */}
                    <div className="p-4 space-y-3">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-secondary flex-shrink-0 overflow-hidden">
                            {item.menuItem.image_url ? (
                              <img
                                src={item.menuItem.image_url}
                                alt={item.menuItem.name_pt}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ImageIcon className="h-4 w-4 text-muted-foreground/30" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-sm">
                              {item.quantity}x {item.menuItem.name_pt}
                            </p>
                            {item.notes && (
                              <p className="text-xs text-muted-foreground">
                                {item.notes}
                              </p>
                            )}
                          </div>
                          <p className="text-sm font-medium">
                            R$ {(Number(item.unit_price) * item.quantity).toFixed(2)}
                          </p>
                        </div>
                      ))}

                      {order.notes && (
                        <div className="pt-2 border-t border-border/30">
                          <p className="text-sm text-muted-foreground">
                            <span className="font-medium">Obs:</span> {order.notes}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="p-4 border-t border-border/50 flex gap-3">
                      {isPending ? (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancel(order.id);
                            }}
                            disabled={isLoading}
                            className="flex-1 py-3 px-4 rounded-xl font-medium bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2"
                          >
                            <X className="h-5 w-5" />
                            {t("cancel")}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleConfirm(order.id);
                            }}
                            disabled={isLoading}
                            className="flex-1 btn-gold py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-2"
                          >
                            {isLoading ? (
                              <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                              <>
                                <Check className="h-5 w-5" />
                                {t("confirm")}
                              </>
                            )}
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancel(order.id);
                            }}
                            disabled={isLoading}
                            className="py-3 px-4 rounded-xl font-medium bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2"
                          >
                            <X className="h-5 w-5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeliver(order.id);
                            }}
                            disabled={isLoading}
                            className="flex-1 btn-gold py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-2"
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
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
