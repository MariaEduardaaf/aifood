"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  Bell,
  Receipt,
  Loader2,
  Check,
  Utensils,
  BookOpen,
} from "lucide-react";
import { LanguageSelector } from "./language-selector";
import { RatingModal } from "./rating-modal";
import { MenuView } from "./menu-view";

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

export function ClientTablePage({ tableId, tableLabel }: ClientTablePageProps) {
  const t = useTranslations("client");

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
  const [showMenu, setShowMenu] = useState(false);

  // Check for existing open calls and pending ratings
  useEffect(() => {
    const checkOpenCalls = async () => {
      try {
        const res = await fetch(`/api/mesa/${tableId}`);
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
      const res = await fetch("/api/chamado", {
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
  if (showMenu) {
    return <MenuView onBack={() => setShowMenu(false)} />;
  }

  return (
    <div className="min-h-screen bg-animated flex flex-col">
      {/* Decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-primary/3 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 py-6 px-6">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20">
              <Utensils className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-gold">aiFood</span>
          </div>
          <LanguageSelector />
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Main Card */}
          <div className="card-premium rounded-2xl p-8">
            {/* Table Label */}
            <div className="text-center mb-10">
              <div
                className="inline-flex items-center justify-center w-24 h-24 rounded-2xl mb-6 glow-gold"
                style={{
                  background:
                    "linear-gradient(145deg, hsl(38 92% 50% / 0.15), hsl(38 92% 50% / 0.05))",
                }}
              >
                <span className="text-5xl">🍽️</span>
              </div>
              <h2 className="text-3xl font-bold text-gold mb-2">
                {tableLabel}
              </h2>
              <div className="divider-gold w-24 mx-auto mt-4" />
            </div>

            {/* Action Buttons */}
            <div className="space-y-5">
              {/* Call Waiter Button */}
              <button
                onClick={() => handleCall("CALL_WAITER")}
                disabled={waiterDisabled}
                className={`
                  w-full flex items-center justify-center gap-3 py-5 px-6 rounded-xl text-lg font-semibold
                  transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed
                  ${
                    hasOpenCall("CALL_WAITER")
                      ? "status-waiting pulse-gold"
                      : "btn-gold"
                  }
                `}
              >
                {loading === "waiter" ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : hasOpenCall("CALL_WAITER") ? (
                  <Check className="h-6 w-6" />
                ) : (
                  <Bell className="h-6 w-6" />
                )}
                <span>
                  {hasOpenCall("CALL_WAITER")
                    ? t("waiterOnTheWay")
                    : cooldown.waiter > 0
                      ? `${t("callWaiter")} (${cooldown.waiter}s)`
                      : t("callWaiter")}
                </span>
              </button>

              {/* Request Bill Button */}
              <button
                onClick={() => handleCall("REQUEST_BILL")}
                disabled={billDisabled}
                className={`
                  w-full flex items-center justify-center gap-3 py-5 px-6 rounded-xl text-lg font-semibold
                  transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed
                  ${
                    hasOpenCall("REQUEST_BILL")
                      ? "status-waiting pulse-gold"
                      : "btn-secondary-premium"
                  }
                `}
              >
                {loading === "bill" ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : hasOpenCall("REQUEST_BILL") ? (
                  <Check className="h-6 w-6" />
                ) : (
                  <Receipt className="h-6 w-6" />
                )}
                <span>
                  {hasOpenCall("REQUEST_BILL")
                    ? t("billRequested")
                    : cooldown.bill > 0
                      ? `${t("requestBill")} (${cooldown.bill}s)`
                      : t("requestBill")}
                </span>
              </button>

              {/* View Menu Button */}
              <button
                onClick={() => setShowMenu(true)}
                className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-xl text-base font-medium
                  transition-all duration-300 bg-secondary/50 border border-border/50 text-foreground hover:bg-secondary"
              >
                <BookOpen className="h-5 w-5" />
                <span>{t("viewMenu")}</span>
              </button>
            </div>

            {/* Success Messages */}
            {success && (
              <div className="mt-8 p-4 rounded-xl text-center status-waiting">
                <Check className="h-5 w-5 inline-block mr-2" />
                <span className="font-medium">{t("callSent")}</span>
              </div>
            )}

            {/* Waiting Message */}
            {(hasOpenCall("CALL_WAITER") || hasOpenCall("REQUEST_BILL")) && (
              <div className="mt-8 text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 text-muted-foreground">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-sm">{t("pleaseWait")}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-6 text-center">
        <p className="text-sm text-muted-foreground">{t("thankYou")}</p>
        <div className="mt-2 flex items-center justify-center gap-1 text-xs text-muted-foreground/60">
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
