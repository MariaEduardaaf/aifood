"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import {
  Bell,
  Receipt,
  Loader2,
  Check,
  BookOpen,
  ShoppingBag,
  Clock,
  ChefHat,
  Sparkles,
} from "lucide-react";
import { useTheme } from "@/components/providers/theme-provider";
import { LanguageSelector } from "./language-selector";
import { RatingModal } from "./rating-modal";
import { MenuView } from "./menu-view";
import { CartModal } from "./cart-modal";
import { OrderStatusView } from "./order-status-view";
import { CartProvider, useCart } from "./cart-context";

interface OpenCall {
  id: string;
  type: "CALL_WAITER" | "REQUEST_BILL";
  created_at: string;
}

interface PendingRating {
  id: string;
  type: "CALL_WAITER" | "REQUEST_BILL";
  resolved_at: string;
}

interface ClientTablePageProps {
  tableId: string;
  tableLabel: string;
}

type View = "main" | "menu" | "cart" | "orders";

function ClientTablePageContent({ tableId, tableLabel }: ClientTablePageProps) {
  const t = useTranslations("client");
  const { itemCount } = useCart();
  const { resolvedTheme } = useTheme();

  const [openCalls, setOpenCalls] = useState<OpenCall[]>([]);
  const [loading, setLoading] = useState<"waiter" | "bill" | null>(null);
  const [cooldown, setCooldown] = useState<{ waiter: number; bill: number }>({
    waiter: 0,
    bill: 0,
  });
  const [success, setSuccess] = useState<"waiter" | "bill" | null>(null);
  const [pendingRating, setPendingRating] = useState<PendingRating | null>(
    null,
  );
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [currentView, setCurrentView] = useState<View>("main");
  const [showCart, setShowCart] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Check for existing open calls and pending ratings
  useEffect(() => {
    const checkOpenCalls = async () => {
      try {
        const res = await fetch(`/api/mesas/${tableId}/status`);
        if (res.ok) {
          const data = await res.json();
          setOpenCalls(data.openCalls || []);

          // Check for pending rating
          if (data.pendingRating) {
            setPendingRating(data.pendingRating);
            setShowRatingModal(true);
          }
        }
      } catch (err) {
        console.error("Error checking open calls:", err);
      }
    };
    checkOpenCalls();
  }, [tableId]);

  // Cooldown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCooldown((prev) => ({
        waiter: Math.max(0, prev.waiter - 1),
        bill: Math.max(0, prev.bill - 1),
      }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Clear success message after 3 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const hasOpenCall = (type: "CALL_WAITER" | "REQUEST_BILL") => {
    return openCalls.some((call) => call.type === type);
  };

  const handleCall = async (type: "CALL_WAITER" | "REQUEST_BILL") => {
    const loadingKey = type === "CALL_WAITER" ? "waiter" : "bill";
    setLoading(loadingKey);

    try {
      const res = await fetch("/api/chamados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableId, type }),
      });

      const data = await res.json();

      if (res.status === 429) {
        // Rate limited
        setCooldown((prev) => ({
          ...prev,
          [loadingKey]: data.waitTime || 30,
        }));
      } else if (res.ok) {
        // Success
        setOpenCalls((prev) => [...prev, data]);
        setSuccess(loadingKey);
      }
    } catch (err) {
      console.error("Error creating call:", err);
    } finally {
      setLoading(null);
    }
  };

  const waiterDisabled =
    loading === "waiter" || cooldown.waiter > 0 || hasOpenCall("CALL_WAITER");
  const billDisabled =
    loading === "bill" || cooldown.bill > 0 || hasOpenCall("REQUEST_BILL");

  // Show menu view
  if (currentView === "menu") {
    return (
      <>
        <MenuView
          tableId={tableId}
          onBack={() => setCurrentView("main")}
          onOpenCart={() => setShowCart(true)}
        />
        {/* Cart Modal - também disponível na view do menu */}
        {showCart && (
          <CartModal
            tableId={tableId}
            onClose={() => setShowCart(false)}
            onOrderSuccess={() => {
              setShowCart(false);
              setCurrentView("orders");
            }}
          />
        )}
      </>
    );
  }

  // Show orders view
  if (currentView === "orders") {
    return (
      <OrderStatusView
        tableId={tableId}
        onBack={() => setCurrentView("main")}
        onNewOrder={() => setCurrentView("menu")}
      />
    );
  }

  // Format time
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-animated flex flex-col">
      {/* Cart Modal */}
      {showCart && (
        <CartModal
          tableId={tableId}
          onClose={() => setShowCart(false)}
          onOrderSuccess={() => {
            setShowCart(false);
            setCurrentView("orders");
          }}
        />
      )}

      {/* Decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-primary/3 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 pt-6 pb-4 px-6">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <div className="flex items-center gap-3">
            <Image
              src={
                resolvedTheme === "dark" ? "/darklogo.webp" : "/lightlogo.webp"
              }
              alt="aiFood Logo"
              width={44}
              height={44}
              className="object-contain"
              priority
            />
            <div>
              <span className="text-xl font-bold text-gold block leading-tight">
                aiFood
              </span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatTime(currentTime)}
              </span>
            </div>
          </div>
          <LanguageSelector />
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex flex-col p-4 pb-6">
        <div className="w-full max-w-md mx-auto flex-1 flex flex-col gap-4">
          {/* Table Header Card */}
          <div className="card-premium rounded-2xl p-5 text-center">
            <div className="flex items-center justify-center gap-3">
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center glow-gold"
                style={{
                  background:
                    "linear-gradient(145deg, hsl(173 72% 44% / 0.15), hsl(173 72% 44% / 0.05))",
                }}
              >
                <ChefHat className="h-7 w-7 text-primary" />
              </div>
              <div className="text-left">
                <h1 className="text-2xl font-bold text-gold">{tableLabel}</h1>
                <p className="text-sm text-muted-foreground">
                  {t("welcomeMessage") || "Bem-vindo! Como podemos ajudar?"}
                </p>
              </div>
            </div>
          </div>

          {/* Primary Action - View Menu */}
          <button
            onClick={() => setCurrentView("menu")}
            className="relative overflow-hidden card-premium rounded-2xl p-6 text-left group hover:scale-[1.02] transition-all duration-300"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-primary/20 transition-colors" />
            <div className="relative flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/30 group-hover:shadow-primary/50 transition-shadow">
                <BookOpen className="h-7 w-7 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  {t("viewMenuOrder")}
                  <Sparkles className="h-4 w-4 text-primary" />
                </h2>
                <p className="text-sm text-muted-foreground">
                  {t("browseAndOrder") ||
                    "Navegue pelo cardápio e faça seu pedido"}
                </p>
              </div>
              {itemCount > 0 && (
                <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center animate-bounce">
                  {itemCount}
                </div>
              )}
            </div>
          </button>

          {/* My Orders Button */}
          <button
            onClick={() => setCurrentView("orders")}
            className="card-premium rounded-2xl p-5 text-left group hover:scale-[1.01] transition-all duration-300"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center group-hover:bg-secondary/80 transition-colors">
                <ShoppingBag className="h-6 w-6 text-foreground" />
              </div>
              <div className="flex-1">
                <h2 className="text-base font-semibold text-foreground">
                  {t("myOrders")}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {t("trackYourOrders") || "Acompanhe seus pedidos"}
                </p>
              </div>
            </div>
          </button>

          {/* Service Buttons Section */}
          <div className="card-premium rounded-2xl p-5 mt-auto">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              {t("needAssistance") || "Precisa de assistência?"}
            </h3>

            <div className="grid grid-cols-2 gap-3">
              {/* Call Waiter Button */}
              <button
                onClick={() => handleCall("CALL_WAITER")}
                disabled={waiterDisabled}
                className={`
                  flex flex-col items-center justify-center gap-2 p-4 rounded-xl font-medium
                  transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed
                  ${
                    hasOpenCall("CALL_WAITER")
                      ? "status-waiting pulse-gold"
                      : "bg-secondary hover:bg-secondary/80 active:scale-95"
                  }
                `}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${hasOpenCall("CALL_WAITER") ? "bg-primary/20" : "bg-primary/10"}`}
                >
                  {loading === "waiter" ? (
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  ) : hasOpenCall("CALL_WAITER") ? (
                    <Check className="h-5 w-5 text-primary" />
                  ) : (
                    <Bell className="h-5 w-5 text-primary" />
                  )}
                </div>
                <span className="text-sm text-center leading-tight">
                  {hasOpenCall("CALL_WAITER")
                    ? t("waiterOnTheWay")
                    : cooldown.waiter > 0
                      ? `${cooldown.waiter}s`
                      : t("callWaiter")}
                </span>
              </button>

              {/* Request Bill Button */}
              <button
                onClick={() => handleCall("REQUEST_BILL")}
                disabled={billDisabled}
                className={`
                  flex flex-col items-center justify-center gap-2 p-4 rounded-xl font-medium
                  transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed
                  ${
                    hasOpenCall("REQUEST_BILL")
                      ? "status-waiting pulse-gold"
                      : "bg-secondary hover:bg-secondary/80 active:scale-95"
                  }
                `}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${hasOpenCall("REQUEST_BILL") ? "bg-primary/20" : "bg-primary/10"}`}
                >
                  {loading === "bill" ? (
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  ) : hasOpenCall("REQUEST_BILL") ? (
                    <Check className="h-5 w-5 text-primary" />
                  ) : (
                    <Receipt className="h-5 w-5 text-primary" />
                  )}
                </div>
                <span className="text-sm text-center leading-tight">
                  {hasOpenCall("REQUEST_BILL")
                    ? t("billRequested")
                    : cooldown.bill > 0
                      ? `${cooldown.bill}s`
                      : t("requestBill")}
                </span>
              </button>
            </div>

            {/* Status Messages */}
            {success && (
              <div className="mt-4 p-3 rounded-xl text-center status-waiting text-sm">
                <Check className="h-4 w-4 inline-block mr-2" />
                <span className="font-medium">{t("callSent")}</span>
              </div>
            )}

            {(hasOpenCall("CALL_WAITER") || hasOpenCall("REQUEST_BILL")) &&
              !success && (
                <div className="mt-4 flex items-center justify-center gap-2 text-muted-foreground">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs">{t("pleaseWait")}</span>
                </div>
              )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-4 text-center">
        <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground/60">
          <span>Powered by</span>
          <span className="text-gold font-semibold">aiFood</span>
        </div>
      </footer>

      {/* Rating Modal */}
      {showRatingModal && pendingRating && (
        <RatingModal
          callId={pendingRating.id}
          onClose={() => {
            setShowRatingModal(false);
            setPendingRating(null);
          }}
          onSuccess={() => {
            setShowRatingModal(false);
            setPendingRating(null);
          }}
        />
      )}
    </div>
  );
}

// Wrapper com CartProvider
export function ClientTablePage({ tableId, tableLabel }: ClientTablePageProps) {
  return (
    <CartProvider>
      <ClientTablePageContent tableId={tableId} tableLabel={tableLabel} />
    </CartProvider>
  );
}
