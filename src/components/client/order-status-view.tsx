"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  ArrowLeft,
  Loader2,
  Clock,
  CheckCircle,
  ChefHat,
  Truck,
  XCircle,
  RefreshCw,
  Image as ImageIcon,
} from "lucide-react";

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
  delivered_at: string | null;
  items: OrderItem[];
}

interface OrderStatusViewProps {
  tableId: string;
  onBack: () => void;
  onNewOrder: () => void;
}

export function OrderStatusView({ tableId, onBack, onNewOrder }: OrderStatusViewProps) {
  const t = useTranslations("orders");
  const locale = useLocale();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchOrders();

    // Atualizar a cada 10 segundos
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, [tableId]);

  const fetchOrders = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);

    try {
      const res = await fetch(`/api/pedidos?tableId=${tableId}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (err) {
      console.error("Error fetching orders:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getName = (item: {
    name_pt: string;
    name_es: string;
    name_en: string;
  }) => {
    switch (locale) {
      case "es":
        return item.name_es;
      case "en":
        return item.name_en;
      default:
        return item.name_pt;
    }
  };

  const getStatusInfo = (status: Order["status"]) => {
    switch (status) {
      case "PENDING":
        return {
          icon: Clock,
          label: t("statusPending"),
          color: "text-yellow-500",
          bgColor: "bg-yellow-500/10",
          borderColor: "border-yellow-500/30",
        };
      case "CONFIRMED":
        return {
          icon: CheckCircle,
          label: t("statusConfirmed"),
          color: "text-blue-500",
          bgColor: "bg-blue-500/10",
          borderColor: "border-blue-500/30",
        };
      case "PREPARING":
        return {
          icon: ChefHat,
          label: t("statusPreparing"),
          color: "text-orange-500",
          bgColor: "bg-orange-500/10",
          borderColor: "border-orange-500/30",
        };
      case "READY":
        return {
          icon: Truck,
          label: t("statusReady"),
          color: "text-green-500",
          bgColor: "bg-green-500/10",
          borderColor: "border-green-500/30",
        };
      case "DELIVERED":
        return {
          icon: CheckCircle,
          label: t("statusDelivered"),
          color: "text-green-600",
          bgColor: "bg-green-600/10",
          borderColor: "border-green-600/30",
        };
      case "CANCELLED":
        return {
          icon: XCircle,
          label: t("statusCancelled"),
          color: "text-red-500",
          bgColor: "bg-red-500/10",
          borderColor: "border-red-500/30",
        };
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTimeSince = (dateString: string) => {
    const now = Date.now();
    const created = new Date(dateString).getTime();
    const minutes = Math.floor((now - created) / 60000);

    if (minutes < 1) return t("justNow");
    if (minutes === 1) return t("oneMinuteAgo");
    if (minutes < 60) return t("minutesAgo", { minutes });

    const hours = Math.floor(minutes / 60);
    if (hours === 1) return t("oneHourAgo");
    return t("hoursAgo", { hours });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b border-border/50">
        <div className="flex items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2.5 rounded-xl hover:bg-secondary transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-lg sm:text-xl font-bold text-gold">
              {t("title")}
            </h1>
          </div>

          <button
            onClick={() => fetchOrders(true)}
            disabled={refreshing}
            className="p-2.5 rounded-xl hover:bg-secondary transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <RefreshCw className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </header>

      {/* Orders List */}
      <main className="p-4 space-y-4">
        {orders.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {t("noOrders")}
            </h3>
            <p className="text-muted-foreground mb-6">{t("noOrdersMessage")}</p>
            <button
              onClick={onNewOrder}
              className="btn-gold px-6 py-3 rounded-xl font-medium"
            >
              {t("makeOrder")}
            </button>
          </div>
        ) : (
          orders.map((order) => {
            const statusInfo = getStatusInfo(order.status);
            const StatusIcon = statusInfo.icon;

            return (
              <div
                key={order.id}
                className={`card-premium rounded-2xl overflow-hidden border ${statusInfo.borderColor}`}
              >
                {/* Order Header */}
                <div className={`p-4 ${statusInfo.bgColor}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <StatusIcon className={`h-5 w-5 ${statusInfo.color}`} />
                      <span className={`font-semibold ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        {formatTime(order.created_at)}
                      </p>
                      <p className="text-xs text-muted-foreground/70">
                        {getTimeSince(order.created_at)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Order Items */}
                <div className="p-4 space-y-3">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-secondary flex-shrink-0 overflow-hidden">
                        {item.menuItem.image_url ? (
                          <img
                            src={item.menuItem.image_url}
                            alt={getName(item.menuItem)}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="h-4 w-4 text-muted-foreground/30" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {item.quantity}x {getName(item.menuItem)}
                        </p>
                        {item.notes && (
                          <p className="text-xs text-muted-foreground truncate">
                            {item.notes}
                          </p>
                        )}
                      </div>
                      <p className="text-sm font-medium text-muted-foreground">
                        R$ {(Number(item.unit_price) * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  ))}

                  {order.notes && (
                    <div className="pt-2 border-t border-border/50">
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">{t("notes")}:</span> {order.notes}
                      </p>
                    </div>
                  )}
                </div>

                {/* Order Footer */}
                <div className="p-4 border-t border-border/50 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total</span>
                  <span className="text-lg font-bold text-primary">
                    R$ {Number(order.total).toFixed(2)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </main>

      {/* Floating Button */}
      {orders.length > 0 && (
        <div className="fixed bottom-6 left-4 right-4 z-20">
          <button
            onClick={onNewOrder}
            className="w-full btn-gold py-4 rounded-xl font-semibold shadow-lg"
          >
            {t("makeAnotherOrder")}
          </button>
        </div>
      )}
    </div>
  );
}
