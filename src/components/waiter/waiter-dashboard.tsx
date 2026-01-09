"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Bell, Receipt, Check, Loader2, Clock } from "lucide-react";
import { cn, formatTime, getUrgencyClass } from "@/lib/utils";

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
}

export function WaiterDashboard({ userId }: WaiterDashboardProps) {
  const t = useTranslations("waiter");

  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [timers, setTimers] = useState<Record<string, number>>({});

  const previousCallsRef = useRef<string[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio
  useEffect(() => {
    audioRef.current = new Audio("/notification.mp3");
    audioRef.current.volume = 0.5;
  }, []);

  // Play notification sound
  const playNotification = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        // Autoplay blocked, ignore
      });
    }
  }, []);

  // Fetch calls with SSE
  useEffect(() => {
    const eventSource = new EventSource("/api/chamados/stream");

    eventSource.onmessage = (event) => {
      try {
        const newCalls: Call[] = JSON.parse(event.data);

        // Check for new calls
        const currentIds = newCalls.map((c) => c.id);
        const previousIds = previousCallsRef.current;
        const hasNewCall = currentIds.some((id) => !previousIds.includes(id));

        if (hasNewCall && previousIds.length > 0) {
          playNotification();
        }

        previousCallsRef.current = currentIds;
        setCalls(newCalls);
        setLoading(false);
      } catch (err) {
        console.error("Error parsing SSE data:", err);
      }
    };

    eventSource.onerror = () => {
      console.error("SSE connection error");
      // Will auto-reconnect
    };

    return () => {
      eventSource.close();
    };
  }, [playNotification]);

  // Update timers every second
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const newTimers: Record<string, number> = {};

      calls.forEach((call) => {
        const createdAt = new Date(call.created_at).getTime();
        newTimers[call.id] = Math.floor((now - createdAt) / 1000);
      });

      setTimers(newTimers);
    }, 1000);

    return () => clearInterval(interval);
  }, [calls]);

  const handleResolve = async (callId: string) => {
    setResolvingId(callId);

    try {
      const res = await fetch(`/api/chamados/${callId}/resolver`, {
        method: "PATCH",
      });

      if (res.ok) {
        // Call will be removed on next SSE update
        setCalls((prev) => prev.filter((c) => c.id !== callId));
      }
    } catch (err) {
      console.error("Error resolving call:", err);
    } finally {
      setResolvingId(null);
    }
  };

  const getCallIcon = (type: Call["type"]) => {
    return type === "CALL_WAITER" ? Bell : Receipt;
  };

  const getCallLabel = (type: Call["type"]) => {
    return type === "CALL_WAITER" ? t("callWaiter") : t("requestBill");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
          <p className="text-muted-foreground">Carregando chamados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gold">
            {t("calls")}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Gerencie os chamados em tempo real
          </p>
        </div>
        <div className="flex items-center gap-3 sm:gap-4">
          <div
            className={cn(
              "flex items-center gap-2 px-4 sm:px-5 py-3 rounded-xl font-semibold",
              calls.length > 0
                ? "bg-gradient-to-r from-red-500/20 to-orange-500/20 text-red-400 border border-red-500/30"
                : "bg-secondary text-muted-foreground",
            )}
          >
            <Bell
              className={cn("h-5 w-5", calls.length > 0 && "animate-pulse")}
            />
            <span className="text-lg">{calls.length}</span>
            <span className="text-sm opacity-80 hidden sm:inline">abertos</span>
          </div>
        </div>
      </div>

      {/* Calls List */}
      {calls.length === 0 ? (
        <div className="card-premium rounded-2xl p-12 text-center">
          <div className="w-20 h-20 rounded-2xl bg-secondary/50 flex items-center justify-center mx-auto mb-6">
            <Bell className="h-10 w-10 text-muted-foreground/50" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">
            {t("noCalls")}
          </h3>
          <p className="text-muted-foreground">
            Quando um cliente chamar, aparecerá aqui
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {calls.map((call) => {
            const Icon = getCallIcon(call.type);
            const seconds = timers[call.id] || 0;
            const urgencyClass = getUrgencyClass(seconds);
            const isResolving = resolvingId === call.id;
            const isUrgent = seconds >= 180;
            const isWarning = seconds >= 60 && seconds < 180;

            return (
              <div
                key={call.id}
                className={cn(
                  "card-premium rounded-2xl p-4 sm:p-6 transition-all duration-300",
                  urgencyClass,
                  isUrgent && "pulse-gold",
                )}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4 sm:gap-5">
                    {/* Icon */}
                    <div
                      className={cn(
                        "p-3 sm:p-4 rounded-xl flex-shrink-0",
                        call.type === "CALL_WAITER"
                          ? "bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30"
                          : "bg-gradient-to-br from-green-500/20 to-green-600/10 border border-green-500/30",
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-6 w-6 sm:h-7 sm:w-7",
                          call.type === "CALL_WAITER"
                            ? "text-blue-400"
                            : "text-green-400",
                        )}
                      />
                    </div>

                    {/* Info */}
                    <div className="min-w-0">
                      <h3 className="font-bold text-lg sm:text-xl text-foreground truncate">
                        {call.table.label}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={cn(
                            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                            call.type === "CALL_WAITER"
                              ? "bg-blue-500/20 text-blue-400"
                              : "bg-green-500/20 text-green-400",
                          )}
                        >
                          {getCallLabel(call.type)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6">
                    {/* Timer */}
                    <div className="text-left sm:text-right">
                      <div
                        className={cn(
                          "flex items-center gap-2 text-2xl sm:text-3xl font-mono font-bold",
                          isUrgent
                            ? "text-red-400"
                            : isWarning
                              ? "text-yellow-400"
                              : "text-green-400",
                        )}
                      >
                        <Clock className="h-4 w-4 sm:h-5 sm:w-5 opacity-60" />
                        {formatTime(seconds)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t("timeOpen")}
                      </p>
                    </div>

                    {/* Resolve Button */}
                    <button
                      onClick={() => handleResolve(call.id)}
                      disabled={isResolving}
                      className="btn-gold flex items-center gap-2 py-3 px-4 sm:px-6 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                    >
                      {isResolving ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <>
                          <Check className="h-5 w-5" />
                          <span className="hidden sm:inline">
                            {t("resolve")}
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
