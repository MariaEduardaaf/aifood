"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Bell, Receipt, Check, Loader2, Clock } from "lucide-react";
import { cn, formatTime, getUrgencyClass } from "@/lib/utils";
import { useLiveRecords, ReconnectBanner } from "@/components/providers/use-event-stream";
import { useStaffAlert } from "@/components/providers/staff-alerts";
import { useToast } from "@/components/ui/toast";

interface Call {
  id: string;
  type: "CALL_WAITER" | "REQUEST_BILL";
  status: "OPEN" | "RESOLVED";
  created_at: string;
  table: {
    id: string;
    label: string;
  };
}

interface WaiterDashboardProps {
  userId: string;
  onCount?: (count: number) => void;
}

export function WaiterDashboard({ onCount }: WaiterDashboardProps) {
  const t = useTranslations("waiter");
  const tErr = useTranslations("errors");
  const toast = useToast();
  const alert = useStaffAlert();

  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const { records: calls, loading, lost, remove } = useLiveRecords<Call>({
    streamUrl: "/api/calls/stream",
    event: "call",
    keep: (c) => c.status === "OPEN",
    sort: (a, b) => a.created_at.localeCompare(b.created_at),
    onChange: (call, previous) => {
      if (!previous) alert();
    },
  });

  useEffect(() => {
    onCount?.(calls.length);
  }, [calls.length, onCount]);

  // One clock for every timer on the screen
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleResolve = async (callId: string) => {
    setResolvingId(callId);
    try {
      const res = await fetch(`/api/calls/${callId}/resolve`, { method: "PATCH" });
      if (res.ok) {
        remove(callId);
        toast(t("callResolved"), "success");
      } else {
        toast(tErr("generic"), "error");
      }
    } catch {
      toast(tErr("generic"), "error");
    } finally {
      setResolvingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
          <p className="text-muted-foreground">{t("loadingCalls")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ReconnectBanner show={lost} />
      {calls.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <Bell className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-1">{t("noCalls")}</h3>
          <p className="text-sm text-muted-foreground text-center max-w-xs">{t("newCallsHint")}</p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-2">
            <span
              aria-live="polite"
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/20"
            >
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              {t("callsCount", { count: calls.length })}
            </span>
          </div>
          <div className="grid gap-4">
            {calls.map((call) => {
              const Icon = call.type === "CALL_WAITER" ? Bell : Receipt;
              const seconds = Math.max(0, Math.floor((now - new Date(call.created_at).getTime()) / 1000));
              const isResolving = resolvingId === call.id;
              const isUrgent = seconds >= 180;
              const isWarning = seconds >= 60 && seconds < 180;
              const isWaiter = call.type === "CALL_WAITER";

              return (
                <div
                  key={call.id}
                  className={cn(
                    "card-premium rounded-2xl p-4 sm:p-6 transition-all duration-300",
                    getUrgencyClass(seconds),
                    isUrgent && "pulse-gold",
                  )}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4 sm:gap-5">
                      <div
                        className={cn(
                          "p-3 sm:p-4 rounded-xl flex-shrink-0 border",
                          isWaiter
                            ? "bg-sky-500/15 border-sky-500/30 text-sky-800 dark:text-sky-300"
                            : "bg-green-500/15 border-green-500/30 text-green-800 dark:text-green-300",
                        )}
                      >
                        <Icon className="h-6 w-6 sm:h-7 sm:w-7" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-lg sm:text-xl text-foreground truncate">
                          {call.table.label}
                        </h3>
                        <span
                          className={cn(
                            "mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold",
                            isWaiter
                              ? "bg-sky-500/15 text-sky-800 dark:text-sky-300"
                              : "bg-green-500/15 text-green-800 dark:text-green-300",
                          )}
                        >
                          {isWaiter ? t("callWaiter") : t("requestBill")}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6">
                      <div className="text-left sm:text-right">
                        <div
                          className={cn(
                            "flex items-center gap-2 text-2xl sm:text-3xl font-bold tabular-nums",
                            isUrgent
                              ? "text-red-700 dark:text-red-300"
                              : isWarning
                                ? "text-amber-800 dark:text-amber-300"
                                : "text-green-800 dark:text-green-300",
                          )}
                        >
                          <Clock className="h-4 w-4 sm:h-5 sm:w-5 opacity-70" />
                          {formatTime(seconds)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{t("timeOpen")}</p>
                      </div>

                      <button
                        onClick={() => handleResolve(call.id)}
                        disabled={isResolving}
                        aria-label={t("resolveCall", { table: call.table.label })}
                        className="btn-gold flex items-center gap-2 py-3 px-4 sm:px-6 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                      >
                        {isResolving ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <>
                            <Check className="h-5 w-5" />
                            <span className="hidden sm:inline">{t("resolve")}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
