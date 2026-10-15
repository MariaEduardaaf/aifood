"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  Clock,
  AlertTriangle,
  CheckCircle,
  Utensils,
  Users,
  Bell,
  RefreshCw,
} from "lucide-react";

interface RealTimeData {
  activeOrders: {
    pending: number;
    confirmed: number;
    preparing: number;
    ready: number;
  };
  openCalls: number;
  occupiedTables: number;
  recentOrders: Array<{
    id: string;
    table: string;
    status: string;
    total: number;
    createdAt: string;
  }>;
  alerts: Array<{
    severity: "WARNING" | "DELAY";
    kind: "ORDER_WAITING" | "MANY_OPEN_CALLS";
    table?: string;
    minutes?: number;
    count?: number;
  }>;
}

interface RealTimePanelProps {
  refreshInterval?: number;
  restaurantId?: string;
}

export function RealTimePanel({
  refreshInterval = 30000,
  restaurantId,
}: RealTimePanelProps) {
  const t = useTranslations("admin.metrics");
  const locale = useLocale();
  const [data, setData] = useState<RealTimeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchData = async () => {
    try {
      const params = new URLSearchParams();
      if (restaurantId) {
        params.set("restaurantId", restaurantId);
      }
      const url = params.toString()
        ? `/api/admin/metrics/real-time?${params.toString()}`
        : "/api/admin/metrics/real-time";
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to load data");
      const result = await response.json();
      setData(result);
      setLastUpdate(new Date());
      setError(null);
    } catch {
      setError(t("loadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval, restaurantId]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      CONFIRMED:
        "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      PREPARING:
        "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
      READY:
        "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      DELIVERED:
        "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
    };
    return colors[status] || colors["PENDING"];
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      PENDING: t("statusPending"),
      CONFIRMED: t("statusConfirmed"),
      PREPARING: t("statusPreparing"),
      READY: t("statusReady"),
      DELIVERED: t("statusDelivered"),
    };
    return labels[status] || status;
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-4 animate-pulse" />
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-16 bg-gray-100 dark:bg-gray-700 rounded animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-600 dark:text-red-400">
        {error}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {t("realTime")}
        </h3>
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <RefreshCw className="w-4 h-4" />
          {t("lastUpdate")}: {formatTime(lastUpdate.toISOString())}
        </div>
      </div>

      {/* Order status */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
            {data.activeOrders.pending}
          </p>
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            {t("pending")}
          </p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {data.activeOrders.confirmed}
          </p>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            {t("confirmed")}
          </p>
        </div>
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            {data.activeOrders.preparing}
          </p>
          <p className="text-sm text-orange-700 dark:text-orange-300">
            {t("preparing")}
          </p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {data.activeOrders.ready}
          </p>
          <p className="text-sm text-green-700 dark:text-green-300">
            {t("ready")}
          </p>
        </div>
      </div>

      {/* Quick indicators */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <Bell className="w-5 h-5 text-yellow-500" />
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("openCalls")}
            </p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {data.openCalls}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <Users className="w-5 h-5 text-blue-500" />
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("occupiedTables")}
            </p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {data.occupiedTables}
            </p>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {data.alerts.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            {t("alerts")}
          </h4>
          <div className="space-y-2">
            {data.alerts.map((alert, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
              >
                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-700 dark:text-red-300">
                  {alert.kind === "ORDER_WAITING"
                    ? t("alertOrderWaiting", {
                        table: alert.table ?? "",
                        minutes: alert.minutes ?? 0,
                      })
                    : t("alertManyCalls", { count: alert.count ?? 0 })}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent orders */}
      <div>
        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <Utensils className="w-4 h-4" />
          {t("recentOrders")}
        </h4>
        <div className="space-y-2">
          {data.recentOrders.map((order) => (
            <div
              key={order.id}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {order.table}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {t("table")} {order.table}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatTime(order.createdAt)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.status)}`}
                >
                  {getStatusLabel(order.status)}
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {formatCurrency(order.total)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
