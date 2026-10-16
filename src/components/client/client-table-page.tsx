"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Bell, BookOpen, Check, ChevronRight, Loader2, Receipt, ShoppingBag, Utensils } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { LanguageSelector, setLocaleCookie } from "./language-selector";
import { RatingModal } from "./rating-modal";
import { MenuView } from "./menu-view";
import { CartModal } from "./cart-modal";
import { OrderStatusView } from "./order-status-view";
import { CartProvider, useCart } from "./cart-context";
import type { GuestSettings, MenuData } from "./types";

type CallType = "CALL_WAITER" | "REQUEST_BILL";

interface OpenCall {
  id: string;
  type: CallType;
  created_at: string;
}

interface PendingRating {
  id: string;
  type: CallType;
  resolved_at: string;
}

interface ClientTablePageProps {
  token: string;
  tableLabel: string;
  restaurantName: string;
  initialSettings: Omit<GuestSettings, "currency">;
}

type View = "main" | "menu" | "orders";

const AUTO_LOCALE_KEY = "aifood-locale-auto";

function ClientTablePageContent({ token, tableLabel, restaurantName, initialSettings }: ClientTablePageProps) {
  const t = useTranslations("client");
  const tErr = useTranslations("errors");
  const locale = useLocale();
  const router = useRouter();
  const toast = useToast();
  const { itemCount, setCurrency } = useCart();

  const [menu, setMenu] = useState<MenuData | null>(null);
  const [menuError, setMenuError] = useState(false);
  const [openCalls, setOpenCalls] = useState<OpenCall[]>([]);
  const [loading, setLoading] = useState<CallType | null>(null);
  const [cooldown, setCooldown] = useState<Record<CallType, number>>({ CALL_WAITER: 0, REQUEST_BILL: 0 });
  const [pendingRating, setPendingRating] = useState<PendingRating | null>(null);
  const [view, setView] = useState<View>("main");
  const [showCart, setShowCart] = useState(false);

  const settings = menu?.settings ?? initialSettings;
  const ordering = settings.ordering_enabled;
  const name = menu?.restaurant.name || restaurantName;

  const loadMenu = useCallback(async () => {
    setMenuError(false);
    try {
      const res = await fetch(`/api/menu?table=${encodeURIComponent(token)}`);
      if (!res.ok) throw new Error(String(res.status));
      const data: MenuData = await res.json();
      setMenu(data);
      setCurrency(data.settings.currency || "EUR");
    } catch {
      setMenuError(true);
    }
  }, [token, setCurrency]);

  useEffect(() => {
    loadMenu();
  }, [loadMenu]);

  // A guest whose language the restaurant does not offer gets the closest
  // offered one, once per session (the flag also stops a refresh loop).
  useEffect(() => {
    const enabled = settings.enabled_locales;
    if (enabled.length === 0 || enabled.includes(locale)) return;
    try {
      if (sessionStorage.getItem(AUTO_LOCALE_KEY)) return;
      sessionStorage.setItem(AUTO_LOCALE_KEY, "1");
    } catch {
      return;
    }
    const preferred = navigator.languages
      .map((l) => l.slice(0, 2).toLowerCase())
      .find((l) => enabled.includes(l));
    setLocaleCookie(preferred ?? settings.default_locale);
    router.refresh();
  }, [settings.enabled_locales, settings.default_locale, locale, router]);

  // Calls the guest already rated or skipped (so the prompt does not come back on reload)
  const ratedKey = `aifood-rated-${token}`;
  const getRated = useCallback((): string[] => {
    try {
      return JSON.parse(localStorage.getItem(ratedKey) || "[]");
    } catch {
      return [];
    }
  }, [ratedKey]);
  const markRated = (id: string) => {
    try {
      localStorage.setItem(ratedKey, JSON.stringify([...getRated(), id].slice(-50)));
    } catch {
      // storage unavailable: prompt may reappear, harmless
    }
  };

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/tables/status?table=${encodeURIComponent(token)}`);
      if (!res.ok) return;
      const data = await res.json();
      setOpenCalls(data.openCalls || []);
      // Only bill requests are rated, and only once
      const pr = data.pendingRating;
      if (pr && pr.type === "REQUEST_BILL" && !getRated().includes(pr.id)) setPendingRating(pr);
    } catch {
      // next poll retries
    }
  }, [token, getRated]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Poll every 10s while a call is open (the waiter may resolve it)
  const hasOpenCall = openCalls.length > 0;
  useEffect(() => {
    if (!hasOpenCall) return;
    const timer = setInterval(checkStatus, 10000);
    return () => clearInterval(timer);
  }, [hasOpenCall, checkStatus]);

  useEffect(() => {
    if (!cooldown.CALL_WAITER && !cooldown.REQUEST_BILL) return;
    const timer = setInterval(() => {
      setCooldown((prev) => ({
        CALL_WAITER: Math.max(0, prev.CALL_WAITER - 1),
        REQUEST_BILL: Math.max(0, prev.REQUEST_BILL - 1),
      }));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown.CALL_WAITER, cooldown.REQUEST_BILL]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [view]);

  const handleCall = async (type: CallType) => {
    setLoading(type);
    try {
      const res = await fetch("/api/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table: token, type }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 429) {
        const seconds = Number(data.waitTime) || 30;
        setCooldown((prev) => ({ ...prev, [type]: seconds }));
        toast(t("waitBeforeNewCall", { seconds }), "info");
      } else if (res.ok) {
        setOpenCalls((prev) => [...prev, data]);
        toast(type === "CALL_WAITER" ? t("waiterCalled") : t("billOnTheWay"), "success");
      } else {
        toast(tErr("generic"), "error");
      }
    } catch {
      toast(tErr("generic"), "error");
    } finally {
      setLoading(null);
    }
  };

  const cart = showCart && ordering && (
    <CartModal
      token={token}
      fallbackLocale={settings.default_locale}
      onClose={() => setShowCart(false)}
      onOrderSuccess={() => {
        setShowCart(false);
        setView("orders");
      }}
    />
  );

  if (view === "menu") {
    return (
      <>
        <MenuView
          menu={menu}
          error={menuError}
          onRetry={loadMenu}
          restaurantName={name}
          onBack={() => setView("main")}
          onOpenCart={() => setShowCart(true)}
        />
        {cart}
      </>
    );
  }

  if (view === "orders" && ordering) {
    return (
      <OrderStatusView
        token={token}
        fallbackLocale={settings.default_locale}
        onBack={() => setView("main")}
        onNewOrder={() => setView("menu")}
      />
    );
  }

  const services: { type: CallType; icon: typeof Bell; label: string; hint: string; done: string }[] = [
    { type: "CALL_WAITER", icon: Bell, label: t("callWaiter"), hint: t("callWaiterHint"), done: t("waiterOnTheWay") },
    { type: "REQUEST_BILL", icon: Receipt, label: t("requestBill"), hint: t("requestBillHint"), done: t("billRequested") },
  ];

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <header className="mx-auto flex w-full max-w-md items-start justify-between gap-4 px-5 pt-[max(1.5rem,env(safe-area-inset-top))]">
        <div className="min-w-0 pt-1">
          <p className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            <Utensils aria-hidden className="h-4 w-4" />
            {tableLabel}
          </p>
        </div>
        <LanguageSelector locales={settings.enabled_locales} />
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-8">
        <h1 className="mt-6 text-balance text-[2.25rem] font-semibold leading-[1.05] tracking-[-0.025em] text-foreground">
          {name}
        </h1>
        <p className="mt-3 max-w-[32ch] text-[0.9375rem] leading-relaxed text-muted-foreground">
          {ordering ? t("introOrdering") : t("introLite")}
        </p>

        <button
          type="button"
          onClick={() => setView("menu")}
          className="mt-8 flex min-h-[4.75rem] w-full items-center gap-4 rounded-2xl bg-primary px-4 text-left text-primary-foreground shadow-[0_10px_30px_-12px_hsl(var(--primary)/0.7)] transition-colors hover:bg-primary/95 active:scale-[0.99]"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-foreground/15">
            <BookOpen aria-hidden className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[1.0625rem] font-semibold leading-tight">
              {ordering ? t("menuAndOrder") : t("seeMenu")}
            </span>
            <span className="mt-0.5 block text-sm opacity-90">
              {ordering && itemCount > 0 ? t("inYourOrder", { count: itemCount }) : t("browseMenuHint")}
            </span>
          </span>
          <ChevronRight aria-hidden className="h-5 w-5 shrink-0 opacity-80" />
        </button>

        {ordering && (
          <button
            type="button"
            onClick={() => setView("orders")}
            className="mt-3 flex min-h-[3.5rem] w-full items-center gap-3 rounded-2xl border border-border bg-card px-4 text-left hover:bg-foreground/[0.06]"
          >
            <ShoppingBag aria-hidden className="h-5 w-5 shrink-0 text-muted-foreground" />
            <span className="flex-1 font-medium text-foreground">{t("myOrders")}</span>
            <ChevronRight aria-hidden className="h-5 w-5 shrink-0 text-muted-foreground" />
          </button>
        )}

        <section aria-labelledby="service-title" className="mt-10">
          <h2 id="service-title" className="text-base font-semibold text-foreground">
            {t("needAssistance")}
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {services.map(({ type, icon: Icon, label, hint, done }) => {
              const open = openCalls.some((c) => c.type === type);
              const busy = loading === type;
              const wait = cooldown[type];
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleCall(type)}
                  disabled={busy || open || wait > 0}
                  className={cn(
                    "flex min-h-[8.5rem] flex-col items-start justify-between gap-4 rounded-2xl border p-4 text-left transition-colors disabled:cursor-not-allowed",
                    open
                      ? "border-success/60 bg-success/10"
                      : "border-border bg-card hover:bg-foreground/[0.06] active:scale-[0.98]",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full",
                      open ? "bg-success text-success-foreground" : "bg-primary/10 text-price",
                    )}
                  >
                    {busy ? (
                      <Loader2 aria-hidden className="h-5 w-5 animate-spin" />
                    ) : open ? (
                      <Check aria-hidden className="h-5 w-5" />
                    ) : (
                      <Icon aria-hidden className="h-5 w-5" />
                    )}
                  </span>
                  <span>
                    <span className="block text-[0.9375rem] font-semibold leading-tight text-foreground">
                      {open ? done : label}
                    </span>
                    <span className="mt-1 block text-[0.8125rem] leading-snug text-muted-foreground tabular-nums">
                      {open ? t("pleaseWait") : wait > 0 ? t("againIn", { seconds: wait }) : hint}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          <p aria-live="polite" className="sr-only">
            {hasOpenCall ? t("pleaseWait") : ""}
          </p>
        </section>
      </main>

      <footer className="mx-auto flex w-full max-w-md items-center justify-between gap-4 border-t border-border px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 text-sm text-muted-foreground">
        <nav aria-label={t("legal")} className="-ml-2 flex">
          <Link href="/privacy" className="flex min-h-[44px] items-center px-2 underline-offset-4 hover:text-foreground hover:underline">
            {t("privacy")}
          </Link>
          <Link href="/cookies" className="flex min-h-[44px] items-center px-2 underline-offset-4 hover:text-foreground hover:underline">
            {t("cookies")}
          </Link>
        </nav>
        <span className="text-xs">{t("poweredBy")}</span>
      </footer>

      {cart}

      {pendingRating && (
        <RatingModal
          callId={pendingRating.id}
          onClose={() => {
            markRated(pendingRating.id);
            setPendingRating(null);
          }}
          onSuccess={() => {
            markRated(pendingRating.id);
            setPendingRating(null);
          }}
        />
      )}
    </div>
  );
}

export function ClientTablePage(props: ClientTablePageProps) {
  return (
    <CartProvider>
      <ClientTablePageContent {...props} />
    </CartProvider>
  );
}
