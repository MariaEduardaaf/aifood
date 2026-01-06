"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Button, Card, CardContent, Badge } from "@/components/ui";
import { Bell, Receipt, Check, Loader2, Volume2, VolumeX } from "lucide-react";
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
  const [soundEnabled, setSoundEnabled] = useState(true);
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
    if (soundEnabled && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        // Autoplay blocked, ignore
      });
    }
  }, [soundEnabled]);

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
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("calls")}</h1>
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? "Desativar som" : "Ativar som"}
          >
            {soundEnabled ? (
              <Volume2 className="h-5 w-5" />
            ) : (
              <VolumeX className="h-5 w-5 text-muted-foreground" />
            )}
          </Button>
          <Badge
            variant={calls.length > 0 ? "destructive" : "secondary"}
            className="text-lg px-4 py-1"
          >
            <Bell className="h-4 w-4 mr-2" />
            {t("openCalls", { count: calls.length })}
          </Badge>
        </div>
      </div>

      {/* Calls List */}
      {calls.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg">{t("noCalls")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {calls.map((call) => {
            const Icon = getCallIcon(call.type);
            const seconds = timers[call.id] || 0;
            const urgencyClass = getUrgencyClass(seconds);
            const isResolving = resolvingId === call.id;

            return (
              <Card
                key={call.id}
                className={cn("border-l-4 transition-all", urgencyClass)}
              >
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className={cn(
                          "p-3 rounded-full",
                          call.type === "CALL_WAITER"
                            ? "bg-blue-100"
                            : "bg-green-100",
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-6 w-6",
                            call.type === "CALL_WAITER"
                              ? "text-blue-600"
                              : "text-green-600",
                          )}
                        />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">
                          {call.table.label}
                        </h3>
                        <p className="text-muted-foreground">
                          {getCallLabel(call.type)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-2xl font-mono font-bold">
                          {formatTime(seconds)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t("timeOpen")}
                        </p>
                      </div>
                      <Button
                        size="lg"
                        variant="success"
                        onClick={() => handleResolve(call.id)}
                        disabled={isResolving}
                      >
                        {isResolving ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <>
                            <Check className="h-5 w-5 mr-2" />
                            {t("resolve")}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
