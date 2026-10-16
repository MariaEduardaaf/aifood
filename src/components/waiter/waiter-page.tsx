"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Bell, ShoppingBag, Utensils } from "lucide-react";
import { WaiterDashboard } from "./waiter-dashboard";
import { OrdersKanban } from "./orders-kanban";
import { useOrderingEnabled } from "@/components/providers/currency";
import { useWakeLock } from "@/components/providers/staff-alerts";
import { cn } from "@/lib/utils";

interface WaiterPageProps {
  userId: string;
  userName?: string;
}

type Tab = "calls" | "orders";

export function WaiterPage({ userId }: WaiterPageProps) {
  const t = useTranslations("waiter");
  const ordering = useOrderingEnabled();
  const [activeTab, setActiveTab] = useState<Tab>("calls");
  const [callsCount, setCallsCount] = useState(0);
  const [ordersCount, setOrdersCount] = useState(0);
  useWakeLock();

  const tabs: { id: Tab; label: string; icon: typeof Bell; count: number }[] = [
    { id: "calls", label: t("calls"), icon: Bell, count: callsCount },
    { id: "orders", label: t("orders"), icon: ShoppingBag, count: ordersCount },
  ];

  return (
    <div className="min-h-screen">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Utensils aria-hidden className="h-5 w-5 text-price" />
          <h1 className="text-lg font-semibold">{t("roleTitle")}</h1>
        </div>

        {/* Lite mode (ordering off): calls only, no tabs */}
        {ordering && (
          <div className="flex gap-1 rounded-full border border-border bg-card p-1">
            {tabs.map(({ id, label, icon: Icon, count }) => (
              <button
                key={id}
                type="button"
                aria-pressed={activeTab === id}
                onClick={() => setActiveTab(id)}
                className={cn(
                  "flex min-h-[44px] items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors",
                  activeTab === id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon aria-hidden className="h-4 w-4" />
                {label}
                {count > 0 && (
                  <span
                    className={cn(
                      "flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-xs font-bold tabular-nums",
                      activeTab === id ? "bg-primary-foreground/20" : "bg-red-600 text-white",
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Both stay mounted so alerts fire whichever tab is open */}
      <div hidden={ordering === true && activeTab !== "calls"}>
        <WaiterDashboard userId={userId} onCount={setCallsCount} />
      </div>
      {ordering && (
        <div hidden={activeTab !== "orders"}>
          <OrdersKanban onCount={setOrdersCount} />
        </div>
      )}
    </div>
  );
}
