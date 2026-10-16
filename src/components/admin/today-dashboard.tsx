"use client";

import { useEffect, useState } from "react";
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

interface Totals {
  orders: { total: number; cancelled: number; averageTicket: number; totalRevenue: number };
  calls?: { total: number };
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

function Delta({ now, before, weekday, inverse = false }: { now: number; before: number; weekday: string; inverse?: boolean }) {
  const t = useTranslations("admin.todayPage");
  const locale = useLocale();
  if (before === 0 && now > 0) {
    return <p className="text-xs text-muted-foreground">{t("noBaseline", { weekday })}</p>;
  }
  const ratio = before === 0 ? 0 : (now - before) / before;
  const pct = new Intl.NumberFormat(locale, {
    style: "percent",
    maximumFractionDigits: 0,
    signDisplay: "exceptZero",
  }).format(ratio);
  const up = ratio > 0;
  const good = ratio === 0 ? null : inverse ? !up : up;
  const Icon = ratio === 0 ? Minus : up ? ChevronUp : ChevronDown;
  return (
    <p
      className={`flex items-center gap-1 text-xs font-medium ${
        good === null ? "text-muted-foreground" : good ? "text-success" : "text-destructive"
      }`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {t("vsLastWeekday", { value: pct, weekday })}
    </p>
  );
}

export function TodayDashboard() {
  const t = useTranslations("admin.todayPage");
  const locale = useLocale();
  const currency = useCurrency();
  const [live, setLive] = useState<RealTime | null>(null);
  const [today, setToday] = useState<Totals | null>(null);
  const [lastWeek, setLastWeek] = useState<Totals | null>(null);
  const weekday = new Intl.DateTimeFormat(locale, { weekday: "long" }).format(new Date());
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const loadLive = () =>
      getJson<RealTime>("/api/admin/metrics/real-time").then((data) => {
        if (data) setLive(data);
      });
    loadLive();
    const id = setInterval(loadLive, LIVE_REFRESH_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    Promise.all([
      getJson<Totals>("/api/admin/metrics/summary?period=today"),
      getJson<Totals>("/api/admin/metrics/summary?period=lastweekday"),
    ]).then(([a, b]) => {
      if (!a) return setFailed(true);
      setToday(a);
      setLastWeek(b);
    });
  }, []);

  const liveCards = [
    { label: t("pendingOrders"), value: live?.activeOrders.pending, icon: Receipt, hot: (live?.activeOrders.pending ?? 0) > 0 },
    { label: t("openCalls"), value: live?.openCalls, icon: Bell, hot: (live?.openCalls ?? 0) > 0 },
    { label: t("occupiedTables"), value: live?.occupiedTables, icon: Utensils, hot: false },
  ];

  // The API already excludes cancelled orders from `total`; cancelled get their own stat.
  const active = (x: Totals) => x.orders.total;
  const totals = today && [
    {
      label: t("orders"),
      value: String(active(today)),
      now: active(today),
      before: lastWeek ? active(lastWeek) : undefined,
      note: today.orders.cancelled > 0 ? t("cancelledCount", { count: today.orders.cancelled }) : null,
    },
    { label: t("revenue"), value: formatMoney(today.orders.totalRevenue, currency, locale), now: today.orders.totalRevenue, before: lastWeek?.orders.totalRevenue },
    { label: t("averageTicket"), value: formatMoney(today.orders.averageTicket, currency, locale), now: today.orders.averageTicket, before: lastWeek?.orders.averageTicket },
    { label: t("calls"), value: String(today.calls?.total ?? 0), now: today.calls?.total ?? 0, before: lastWeek ? (lastWeek.calls?.total ?? 0) : undefined },
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
                  {c.before === undefined ? (
                    <p className="text-xs text-muted-foreground">{t("noBaseline", { weekday })}</p>
                  ) : (
                    <Delta now={c.now} before={c.before} weekday={weekday} />
                  )}
                  {"note" in c && c.note && <p className="mt-1 text-xs text-muted-foreground">{c.note}</p>}
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
