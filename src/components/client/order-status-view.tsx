"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { localizedText } from "@/lib/i18n/text";
import { cn, formatMoney } from "@/lib/utils";
import { useCart } from "./cart-context";
import type { LocaleMap } from "./types";

type OrderStatus = "PENDING" | "CONFIRMED" | "PREPARING" | "READY" | "DELIVERED" | "CANCELLED";

interface OrderItem {
  id: string;
  quantity: number;
  unit_price: number | string;
  notes: string | null;
  menuItem: { id: string; names: LocaleMap; image_url: string | null };
}

interface Order {
  id: string;
  status: OrderStatus;
  total: number | string;
  notes: string | null;
  created_at: string;
  items: OrderItem[];
}

interface OrderStatusViewProps {
  token: string;
  fallbackLocale: string;
  onBack: () => void;
  onNewOrder: () => void;
}

// The order lifecycle as the guest sees it; CANCELLED sits outside it
const STEPS: OrderStatus[] = ["PENDING", "CONFIRMED", "PREPARING", "READY", "DELIVERED"];

const STATUS_STYLE: Record<OrderStatus, string> = {
  PENDING: "text-amber-800 dark:text-amber-300",
  CONFIRMED: "text-sky-800 dark:text-sky-300",
  PREPARING: "text-orange-800 dark:text-orange-300",
  READY: "text-green-800 dark:text-green-300",
  DELIVERED: "text-muted-foreground",
  CANCELLED: "text-red-700 dark:text-red-300",
};

export function OrderStatusView({ token, fallbackLocale, onBack, onNewOrder }: OrderStatusViewProps) {
  const t = useTranslations("orders");
  const locale = useLocale();
  const { currency } = useCart();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = useCallback(
    async (showRefresh = false) => {
      if (showRefresh) setRefreshing(true);
      try {
        const res = await fetch(`/api/orders?table=${encodeURIComponent(token)}`);
        if (!res.ok) throw new Error(String(res.status));
        setOrders(await res.json());
        setFailed(false);
      } catch {
        setFailed(true);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token],
  );

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const statusLabel = (status: OrderStatus) =>
    ({
      PENDING: t("statusPending"),
      CONFIRMED: t("statusConfirmed"),
      PREPARING: t("statusPreparing"),
      READY: t("statusReady"),
      DELIVERED: t("statusDelivered"),
      CANCELLED: t("statusCancelled"),
    })[status];

  const timeSince = (dateString: string) => {
    const minutes = Math.floor((Date.now() - new Date(dateString).getTime()) / 60000);
    if (minutes < 1) return t("justNow");
    if (minutes === 1) return t("oneMinuteAgo");
    if (minutes < 60) return t("minutesAgo", { minutes });
    const hours = Math.floor(minutes / 60);
    return hours === 1 ? t("oneHourAgo") : t("hoursAgo", { hours });
  };

  return (
    <div className={cn("min-h-screen bg-background", orders.length > 0 ? "pb-32" : "pb-12")}>
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-2 px-2 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
          <button
            type="button"
            onClick={onBack}
            aria-label={t("back")}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-foreground/[0.06]"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="flex-1 text-lg font-semibold tracking-tight">{t("title")}</h1>
          <button
            type="button"
            onClick={() => fetchOrders(true)}
            disabled={refreshing}
            aria-label={t("refresh")}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-foreground/[0.06]"
          >
            <RefreshCw className={cn("h-5 w-5", refreshing && "animate-spin")} />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 px-4 pt-5">
        {loading ? (
          <div aria-hidden className="space-y-4">
            {[0, 1].map((i) => (
              <div key={i} className="shimmer h-40 rounded-2xl" />
            ))}
          </div>
        ) : failed && orders.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-lg font-semibold text-foreground">{t("loadError")}</p>
            <button
              type="button"
              onClick={() => fetchOrders(true)}
              className="mt-5 h-11 rounded-full border border-border px-5 text-sm font-semibold hover:bg-foreground/[0.06]"
            >
              {t("refresh")}
            </button>
          </div>
        ) : orders.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-lg font-semibold text-foreground">{t("noOrders")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("noOrdersMessage")}</p>
            <button
              type="button"
              onClick={onNewOrder}
              className="mt-6 h-12 rounded-full bg-primary px-6 font-semibold text-primary-foreground hover:bg-primary/90"
            >
              {t("makeOrder")}
            </button>
          </div>
        ) : (
          orders.map((order) => {
            const step = STEPS.indexOf(order.status);
            return (
              <article key={order.id} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-start justify-between gap-3">
                  <p aria-live="polite" className={cn("min-w-0 text-base font-semibold leading-snug", STATUS_STYLE[order.status])}>
                    {statusLabel(order.status)}
                  </p>
                  <p className="shrink-0 text-right text-sm leading-snug tabular-nums text-muted-foreground">
                    <time dateTime={order.created_at} className="block text-foreground">
                      {new Date(order.created_at).toLocaleTimeString(locale, {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                    <span className="sr-only">, </span>
                    <span className="block text-xs">{timeSince(order.created_at)}</span>
                  </p>
                </div>

                {step >= 0 && (
                  <div aria-hidden className="mt-3 grid grid-cols-5 gap-1">
                    {STEPS.map((s, i) => (
                      <div
                        key={s}
                        className={cn("h-1 rounded-full", i <= step ? "bg-primary" : "bg-foreground/[0.07]")}
                      />
                    ))}
                  </div>
                )}

                <ul className="mt-4 space-y-2">
                  {order.items.map((item) => (
                    <li key={item.id} className="flex items-start gap-3 text-[0.9375rem]">
                      <span className="w-7 shrink-0 font-semibold tabular-nums text-foreground">
                        {item.quantity}×
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-foreground">
                          {localizedText(item.menuItem.names, locale, fallbackLocale)}
                        </p>
                        {item.notes && <p className="text-sm text-muted-foreground">{item.notes}</p>}
                      </div>
                      <span className="tabular-nums text-muted-foreground">
                        {formatMoney(Number(item.unit_price) * item.quantity, currency, locale)}
                      </span>
                    </li>
                  ))}
                </ul>

                {order.notes && (
                  <p className="mt-3 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{t("notes")}:</span> {order.notes}
                  </p>
                )}

                <div className="mt-4 flex items-baseline justify-between border-t border-border pt-3">
                  <span className="text-sm text-muted-foreground">{t("total")}</span>
                  <span className="text-lg font-semibold tabular-nums text-foreground">
                    {formatMoney(order.total, currency, locale)}
                  </span>
                </div>
              </article>
            );
          })
        )}
      </main>

      {orders.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onNewOrder}
            className="mx-auto flex h-14 w-full max-w-2xl items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground shadow-[0_8px_24px_-6px_rgba(0,0,0,0.35)] hover:bg-primary/95"
          >
            {t("makeAnotherOrder")}
          </button>
        </div>
      )}
    </div>
  );
}
