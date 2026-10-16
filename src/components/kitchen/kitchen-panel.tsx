"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  ChefHat,
  Loader2,
  Clock,
  Check,
} from "lucide-react";
import { cn, formatTime } from "@/lib/utils";
import { localizedText } from "@/lib/i18n/text";
import { useSound } from "@/components/providers/sound-provider";
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
  const tErr = useTranslations("errors");
  const locale = useLocale();
  const { playSuccess } = useSound();
  const alert = useStaffAlert();
  const toast = useToast();

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const { records: orders, loading, lost } = useLiveRecords<Order>({
    streamUrl: "/api/orders/stream",
    event: "order",
    keep: (o) => o.status === "CONFIRMED" || o.status === "PREPARING" || o.status === "READY",
    sort: (a, b) => b.created_at.localeCompare(a.created_at),
    onChange: (order) => {
      if (order.status === "CONFIRMED") alert();
    },
  });

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

  const getUrgencyColor = (seconds: number) => {
    if (seconds >= 600) return "text-red-700 dark:text-red-300"; // > 10 min
    if (seconds >= 300) return "text-amber-800 dark:text-amber-300"; // > 5 min
    return "text-green-800 dark:text-green-300";
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
            <h3 className="font-bold text-2xl">{order.table.label}</h3>
            <div
              className={cn(
                "flex items-center gap-1 font-bold tabular-nums text-sm",
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
            <div key={item.id} className="flex items-start gap-3">
              <span className="w-9 shrink-0 text-lg font-bold tabular-nums text-price">
                {item.quantity}×
              </span>
              <div className="flex-1">
                <p className="font-medium text-lg">
                  {localizedText(item.menuItem.names, locale, locale)}
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
                onClick={() => handleStartPreparing(order.id)}
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
                onClick={() => handleMarkReady(order.id)}
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
  };

  const totalOrders =
    confirmedOrders.length + preparingOrders.length + readyOrders.length;

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
        <div
          className={cn(
            "card-premium rounded-xl p-4 text-center relative",
            confirmedOrders.length > 0 &&
              "ring-2 ring-yellow-500/50 animate-pulse",
          )}
        >
          <p className="text-2xl font-bold tabular-nums text-amber-800 dark:text-amber-300">
            {confirmedOrders.length}
          </p>
          <p className="text-xs text-muted-foreground">{t("newOrders")}</p>
          {confirmedOrders.length > 0 && (
            <span className="absolute -top-2 -right-2 min-w-[24px] h-6 px-1.5 flex items-center justify-center bg-amber-700 text-white text-xs font-bold rounded-full">
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
          <p className="text-2xl font-bold tabular-nums text-orange-800 dark:text-orange-300">
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
          <p className="text-2xl font-bold tabular-nums text-green-800 dark:text-green-300">
            {readyOrders.length}
          </p>
          <p className="text-xs text-muted-foreground">{t("ready")}</p>
          {readyOrders.length > 0 && (
            <span className="absolute -top-2 -right-2 min-w-[24px] h-6 px-1.5 flex items-center justify-center bg-green-700 text-white text-xs font-bold rounded-full">
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
