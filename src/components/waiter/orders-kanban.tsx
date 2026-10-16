"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  ShoppingBag,
  Loader2,
  Clock,
  Check,
  X,
  Truck,
  ChefHat,
} from "lucide-react";
import { cn, formatMoney, formatTime } from "@/lib/utils";
import { localizedText } from "@/lib/i18n/text";
import { useSound } from "@/components/providers/sound-provider";
import { useCurrency, useDefaultLocale } from "@/components/providers/currency";
import { useLiveRecords, ReconnectBanner } from "@/components/providers/use-event-stream";
import { useStaffAlert } from "@/components/providers/staff-alerts";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";

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
}

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
  const locale = useLocale();
  const currency = useCurrency();
  const defaultLocale = useDefaultLocale();

  const getUrgencyColor = (secs: number) => {
    if (secs >= 180) return "text-red-700 dark:text-red-300";
    if (secs >= 60) return "text-amber-800 dark:text-amber-300";
    return "text-green-800 dark:text-green-300";
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
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg">{order.table.label}</h3>
            <p className="text-sm text-muted-foreground">
              {t("itemCount", { count: order.items.length })} • {formatMoney(order.total, currency, locale)}
            </p>
          </div>
          <div className="text-right">
            <div
              className={cn(
                "flex items-center gap-1 font-bold tabular-nums",
                getUrgencyColor(seconds)
              )}
            >
              <Clock className="h-4 w-4" />
              {formatTime(seconds)}
            </div>
          </div>
        </div>
      </div>

      {/* Items, always visible so the waiter reads the order without a tap */}
      <div className="px-4 pb-4 space-y-2 border-t border-border/30 pt-3">
        {order.items.map((item) => (
          <div key={item.id} className="flex items-start gap-3">
            <span className="w-7 shrink-0 font-bold tabular-nums text-price">{item.quantity}×</span>
            <div className="flex-1">
              <p className="font-medium text-sm">
                {localizedText(item.menuItem.names, locale, defaultLocale)}
              </p>
              {item.notes && (
                <p className="mt-1 inline-block rounded-md bg-amber-200 px-2 py-1 text-sm font-semibold text-amber-950">{item.notes}</p>
              )}
            </div>
          </div>
        ))}

        {order.notes && (
          <div className="pt-2 mt-2 border-t border-border/30">
            <p className="rounded-md bg-amber-200 px-3 py-2 text-sm font-semibold text-amber-950">
              <span className="font-medium">{t("notes")}:</span> {order.notes}
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-3 border-t border-border/30">
        {type === "pending" && (
          <div className="flex gap-4">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCancel?.();
              }}
              disabled={isLoading}
              className="py-2.5 px-3 min-h-[44px] rounded-xl font-medium text-muted-foreground hover:text-red-600 hover:bg-red-500/10 transition-colors flex items-center justify-center gap-1 text-sm"
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
              className="flex-1 py-2.5 px-3 min-h-[44px] rounded-xl font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 text-sm"
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
          <div className="flex items-center justify-center gap-2 py-2 text-sky-800 dark:text-sky-300">
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
            className="w-full min-h-[44px] py-3 px-4 rounded-xl font-medium bg-green-700 hover:bg-green-800 text-white transition-colors flex items-center justify-center gap-2"
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

export function OrdersKanban({ onCount }: { onCount?: (count: number) => void }) {
  const t = useTranslations("waiter");
  const tErr = useTranslations("errors");
  const { playSuccess } = useSound();
  const alert = useStaffAlert();
  const toast = useToast();
  const { confirm, dialog } = useConfirm();

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const { records: orders, loading, lost, remove } = useLiveRecords<Order>({
    streamUrl: "/api/orders/stream",
    event: "order",
    keep: (o) => o.status === "PENDING" || o.status === "CONFIRMED" || o.status === "READY",
    sort: (a, b) => b.created_at.localeCompare(a.created_at),
    // New order to confirm, or an order the kitchen just finished
    onChange: (order, previous) => {
      if ((!previous && order.status === "PENDING") || order.status === "READY") alert();
    },
  });

  // Orders that need the waiter: to confirm or to deliver
  const actionable = orders.filter((o) => o.status === "PENDING" || o.status === "READY").length;
  useEffect(() => {
    onCount?.(actionable);
  }, [actionable, onCount]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const timers: Record<string, number> = {};
  for (const order of orders) {
    timers[order.id] = Math.max(0, Math.floor((now - new Date(order.created_at).getTime()) / 1000));
  }

  const runAction = async (orderId: string, action: "confirm" | "cancel" | "deliver") => {
    setActionLoading(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}/${action}`, { method: "PATCH" });
      if (!res.ok) {
        toast(tErr("generic"), "error");
        return;
      }
      if (action !== "confirm") remove(orderId);
      if (action !== "cancel") playSuccess();
      toast(
        action === "confirm" ? t("orderConfirmed") : action === "deliver" ? t("orderDelivered") : t("orderCancelled"),
        "success",
      );
    } catch {
      toast(tErr("generic"), "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirm = (orderId: string) => runAction(orderId, "confirm");
  const handleDeliver = (orderId: string) => runAction(orderId, "deliver");
  const handleCancel = async (orderId: string) => {
    const ok = await confirm({
      title: t("cancelOrderTitle"),
      message: t("confirmCancelOrder"),
      confirmLabel: t("cancelOrder"),
      cancelLabel: t("keepOrder"),
    });
    if (ok) runAction(orderId, "cancel");
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
        <ReconnectBanner show={lost} />
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
      {dialog}
      <ReconnectBanner show={lost} />
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className={cn(
          "card-premium rounded-xl p-4 text-center relative",
          pendingOrders.length > 0 && "ring-2 ring-yellow-500/30"
        )}>
          <p className="text-2xl font-bold tabular-nums text-amber-800 dark:text-amber-300">{pendingOrders.length}</p>
          <p className="text-xs text-muted-foreground">{t("pending")}</p>
          {pendingOrders.length > 0 && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full animate-pulse" />
          )}
        </div>
        <div className="card-premium rounded-xl p-4 text-center">
          <p className="text-2xl font-bold tabular-nums text-sky-800 dark:text-sky-300">{confirmedOrders.length}</p>
          <p className="text-xs text-muted-foreground">{t("confirmed")}</p>
        </div>
        <div className={cn(
          "card-premium rounded-xl p-4 text-center relative",
          readyOrders.length > 0 && "ring-2 ring-green-500/30"
        )}>
          <p className="text-2xl font-bold tabular-nums text-green-800 dark:text-green-300">{readyOrders.length}</p>
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
                {t("noPendingOrders")}
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
                {t("noKitchenOrders")}
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
                {t("noReadyOrders")}
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
