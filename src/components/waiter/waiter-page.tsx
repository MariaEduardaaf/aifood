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
    <div className="min-h-screen">
      {/* Tabs */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border/50">
        <div className="flex">
          <button
            onClick={() => setActiveTab("calls")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-4 px-4 font-medium transition-colors",
              activeTab === "calls"
                ? "text-primary border-b-2 border-primary bg-primary/5"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
            )}
          >
            <Bell className="h-5 w-5" />
            <span>{t("calls")}</span>
          </button>
          <button
            onClick={() => setActiveTab("orders")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-4 px-4 font-medium transition-colors",
              activeTab === "orders"
                ? "text-primary border-b-2 border-primary bg-primary/5"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
            )}
          >
            <ShoppingBag className="h-5 w-5" />
            <span>{t("orders")}</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6">
        {activeTab === "calls" ? (
          <WaiterDashboard userId={userId} />
        ) : (
          <OrdersPanel />
        )}
      </div>
    </div>
  );
}
