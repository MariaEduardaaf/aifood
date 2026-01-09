"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Bell, ShoppingBag } from "lucide-react";
import { WaiterDashboard } from "./waiter-dashboard";
import { OrdersPanel } from "./orders-panel";
import { cn } from "@/lib/utils";

interface WaiterPageProps {
  userId: string;
}

type Tab = "calls" | "orders";

export function WaiterPage({ userId }: WaiterPageProps) {
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

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {/* Tabs compactas */}
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
        <OrdersPanel />
      )}
    </div>
  );
}
