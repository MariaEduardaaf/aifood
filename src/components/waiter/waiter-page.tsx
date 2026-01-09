"use client";

import { useState } from "react";
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

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {/* Tabs compactas */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab("calls")}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-full font-medium transition-all duration-200",
            activeTab === "calls"
              ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
              : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground",
          )}
        >
          <Bell className="h-4 w-4" />
          <span>{t("calls")}</span>
        </button>
        <button
          onClick={() => setActiveTab("orders")}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-full font-medium transition-all duration-200",
            activeTab === "orders"
              ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
              : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground",
          )}
        >
          <ShoppingBag className="h-4 w-4" />
          <span>{t("orders")}</span>
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
