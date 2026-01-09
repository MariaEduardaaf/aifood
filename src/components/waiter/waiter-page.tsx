"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Bell, ShoppingBag, LogOut, Utensils } from "lucide-react";
import { signOut } from "next-auth/react";
import { WaiterDashboard } from "./waiter-dashboard";
import { OrdersKanban } from "./orders-kanban";
import { ThemeToggleCompact } from "@/components/ui/theme-toggle";
import { SoundToggleCompact } from "@/components/ui/sound-settings";
import { cn } from "@/lib/utils";

interface WaiterPageProps {
  userId: string;
  userName?: string;
}

type Tab = "calls" | "orders";

export function WaiterPage({ userId, userName = "Garçom" }: WaiterPageProps) {
  const t = useTranslations("waiter");
  const [activeTab, setActiveTab] = useState<Tab>("calls");
  const [callsCount, setCallsCount] = useState(0);
  const [ordersCount, setOrdersCount] = useState(0);

  // Fetch counts for badges
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        // Fetch calls count
        const callsRes = await fetch("/api/chamados");
        if (callsRes.ok) {
          const calls = await callsRes.json();
          setCallsCount(calls.filter((c: any) => c.status === "OPEN").length);
        }

        // Fetch orders count (pending orders)
        const ordersRes = await fetch("/api/pedidos");
        if (ordersRes.ok) {
          const orders = await ordersRes.json();
          setOrdersCount(
            orders.filter(
              (o: any) => o.status === "PENDING" || o.status === "READY",
            ).length,
          );
        }
      } catch (err) {
        console.error("Error fetching counts:", err);
      }
    };

    fetchCounts();

    // Poll every 10 seconds
    const interval = setInterval(fetchCounts, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border/50 -mx-4 px-4 -mt-6 pt-4 pb-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Utensils className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-lg">Garçom</h1>
              <p className="text-sm text-muted-foreground">{userName}</p>
            </div>
          </div>

          {/* Controles */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-secondary/50 border border-border/50">
            <SoundToggleCompact />
            <ThemeToggleCompact />
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab("calls")}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-full font-medium transition-all duration-200 relative",
            activeTab === "calls"
              ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
              : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground",
          )}
        >
          <Bell className="h-4 w-4" />
          <span>{t("calls")}</span>
          {callsCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">
              {callsCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("orders")}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-full font-medium transition-all duration-200 relative",
            activeTab === "orders"
              ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
              : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground",
          )}
        >
          <ShoppingBag className="h-4 w-4" />
          <span>{t("orders")}</span>
          {ordersCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 flex items-center justify-center bg-orange-500 text-white text-xs font-bold rounded-full animate-pulse">
              {ordersCount}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      {activeTab === "calls" ? (
        <WaiterDashboard userId={userId} />
      ) : (
        <OrdersKanban />
      )}
    </div>
  );
}
