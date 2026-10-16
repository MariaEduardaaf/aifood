"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Bell, Receipt, Utensils, ChevronDown, ChevronUp, Minus } from "lucide-react";
import { formatMoney } from "@/lib/utils";
import { useCurrency } from "@/components/providers/currency";
import { OrdersByHourChart } from "./metrics/orders-by-hour-chart";
import { TopProductsChart } from "./metrics/top-products-chart";

interface RealTime {
  activeOrders: { pending: number };
  openCalls: number;
  occupiedTables: number;
}

interface OrderTotals {
  total: number;
  cancelled: number;
  averageTicket: number;
  totalRevenue: number;
}

const LIVE_REFRESH_MS = 15000;

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

// ponytail: the summary API has no "same weekday last week" period, so the
// delta compares today with yesterday. Add the period server-side to upgrade.
function Delta({ now, before, inverse = false }: { now: number; before: number; inverse?: boolean }) {
  const t = useTranslations("admin.todayPage");
  if (before === 0 && now === 0) {
    return <p className="text-xs text-muted-foreground">{t("vsYesterday", { value: "0%" })}</p>;
  }
  if (before === 0) {
    return <p className="text-xs text-muted-foreground">{t("noBaseline")}</p>;
  }
  const pct = Math.round(((now - before) / before) * 100);
  const up = pct > 0;
  const good = pct === 0 ? null : inverse ? !up : up;
  const Icon = pct === 0 ? Minus : up ? ChevronUp : ChevronDown;
  return (
    <p
      className={`flex items-center gap-1 text-xs font-medium ${
        good === null ? "text-muted-foreground" : good ? "text-success" : "text-destructive"
      }`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {t("vsYesterday", { value: `${up ? "+" : ""}${pct}%` })}
    </p>
  );
}

export function TodayDashboard() {
  const t = useTranslations("admin.todayPage");
  const locale = useLocale();
  const currency = useCurrency();
  const [live, setLive] = useState<RealTime | null>(null);
  const [today, setToday] = useState<OrderTotals | null>(null);
  const [yesterday, setYesterday] = useState<OrderTotals | null>(null);
  const [failed, setFailed] = useState(false);

  const loadLive = useCallback(async () => {
    const data = await getJson<RealTime>("/api/admin/metrics/real-time");
    if (data) setLive(data);
  }, []);

  useEffect(() => {
    loadLive();
    const id = setInterval(loadLive, LIVE_REFRESH_MS);
    return () => clearInterval(id);
  }, [loadLive]);

  useEffect(() => {
    Promise.all([
      getJson<{ orders: OrderTotals }>("/api/admin/metrics/summary?period=today"),
      getJson<{ orders: OrderTotals }>("/api/admin/metrics/summary?period=yesterday"),
    ]).then(([a, b]) => {
      if (!a) return setFailed(true);
      setToday(a.orders);
      setYesterday(b?.orders ?? null);
    });
  }, []);

  const liveCards = [
    { label: t("pendingOrders"), value: live?.activeOrders.pending, icon: Receipt, hot: (live?.activeOrders.pending ?? 0) > 0 },
    { label: t("openCalls"), value: live?.openCalls, icon: Bell, hot: (live?.openCalls ?? 0) > 0 },
    { label: t("occupiedTables"), value: live?.occupiedTables, icon: Utensils, hot: false },
  ];

  const totals = today && [
    { label: t("orders"), value: String(today.total), now: today.total, before: yesterday?.total },
    { label: t("revenue"), value: formatMoney(today.totalRevenue, currency, locale), now: today.totalRevenue, before: yesterday?.totalRevenue },
    { label: t("averageTicket"), value: formatMoney(today.averageTicket, currency, locale), now: today.averageTicket, before: yesterday?.averageTicket },
    { label: t("cancellations"), value: String(today.cancelled), now: today.cancelled, before: yesterday?.cancelled, inverse: true },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      <section aria-label={t("liveNow")} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {liveCards.map(({ label, value, icon: Icon, hot }) => (
          <div
            key={label}
            className={`card-premium flex items-center gap-4 rounded-2xl p-4 ${hot ? "ring-2 ring-primary/60" : ""}`}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Icon className="h-6 w-6 text-primary" aria-hidden />
            </div>
            <div>
              <p className="text-3xl font-bold leading-none text-foreground">{value ?? "-"}</p>
              <p className="mt-1 text-sm text-muted-foreground">{label}</p>
            </div>
          </div>
        ))}
      </section>

      <section aria-label={t("totals")}>
        {failed ? (
          <p role="alert" className="text-sm text-destructive">{t("loadError")}</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {(totals ?? [1, 2, 3, 4].map(() => null)).map((c, i) =>
              c ? (
                <div key={c.label} className="card-premium rounded-2xl p-4">
                  <p className="text-sm text-muted-foreground">{c.label}</p>
                  <p className="my-1 text-2xl font-bold text-foreground">{c.value}</p>
                  {c.before === undefined ? null : (
                    <Delta now={c.now} before={c.before} inverse={c.inverse} />
                  )}
                </div>
              ) : (
                <div key={i} className="card-premium h-[104px] animate-pulse rounded-2xl" />
              ),
            )}
          </div>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <OrdersByHourChart period="today" />
        </div>
        <TopProductsChart period="today" limit={5} />
      </div>
    </div>
  );
}
