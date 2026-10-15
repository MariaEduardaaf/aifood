"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Loader2, Clock, Bell, Receipt } from "lucide-react";
import { Button, Card, CardContent, Badge } from "@/components/ui";
import { formatTime, getUrgencyClass, formatMoney } from "@/lib/utils";
import { useCurrency } from "@/components/providers/currency";

interface Call {
  id: string;
  type: "CALL_WAITER" | "REQUEST_BILL";
  status: "OPEN" | "RESOLVED";
  created_at: string;
  table: {
    id: string;
    label: string;
  };
  resolver: {
    id: string;
    name: string;
  } | null;
}

interface Order {
  id: string;
  status: "PENDING" | "CONFIRMED" | "READY" | "DELIVERED" | "CANCELLED";
  total: number;
  created_at: string;
  table: {
    id: string;
    label: string;
  };
}

interface OperationsPanelProps {
  restaurantId: string;
}

export function OperationsPanel({ restaurantId }: OperationsPanelProps) {
  const t = useTranslations("superadmin.operations");
  const locale = useLocale();
  const currency = useCurrency(restaurantId);
  const [calls, setCalls] = useState<Call[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<"calls" | "orders">("calls");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [restaurantId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [callsRes, ordersRes] = await Promise.all([
        fetch(`/api/calls?status=OPEN&restaurantId=${restaurantId}`),
        fetch(`/api/orders?restaurantId=${restaurantId}`),
      ]);

      if (callsRes.ok) {
        const callsData = await callsRes.json();
        setCalls(callsData);
      }
      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        setOrders(ordersData);
      }
    } catch (err) {
      console.error("Error fetching operations data:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t("subtitle")}
          </p>
        </div>
        <Button variant="outline" onClick={fetchData}>
          {t("refresh")}
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant={activeTab === "calls" ? "default" : "outline"}
          onClick={() => setActiveTab("calls")}
        >
          <Bell className="h-4 w-4 mr-2" />
          {t("callsTab", { count: calls.length })}
        </Button>
        <Button
          variant={activeTab === "orders" ? "default" : "outline"}
          onClick={() => setActiveTab("orders")}
        >
          <Receipt className="h-4 w-4 mr-2" />
          {t("ordersTab", { count: orders.length })}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : activeTab === "calls" ? (
        calls.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              {t("noCalls")}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {calls.map((call) => {
              const elapsedSeconds = Math.floor(
                (Date.now() - new Date(call.created_at).getTime()) / 1000,
              );

              return (
                <Card key={call.id} className={getUrgencyClass(elapsedSeconds)}>
                  <CardContent className="py-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold">{call.table.label}</h3>
                          <Badge variant="outline">
                            {call.type === "CALL_WAITER"
                              ? t("callWaiter")
                              : t("requestBill")}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {t("openFor", { time: formatTime(elapsedSeconds) })}
                        </p>
                        {call.resolver && (
                          <p className="text-xs text-muted-foreground">
                            {t("resolvedBy", { name: call.resolver.name })}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        {new Date(call.created_at).toLocaleTimeString(locale, {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {t("noOrders")}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {orders.map((order) => (
            <Card key={order.id}>
              <CardContent className="py-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">{order.table.label}</h3>
                      <Badge variant="outline">{t(`status.${order.status}`)}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {t("total", {
                        value: formatMoney(order.total, currency, locale),
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {new Date(order.created_at).toLocaleTimeString(locale, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
