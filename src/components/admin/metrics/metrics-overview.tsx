"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  ShoppingCart,
  DollarSign,
  Clock,
  TrendingUp,
  CheckCircle,
  XCircle,
  Bell,
  Star,
} from "lucide-react";

interface MetricsSummary {
  orders: {
    total: number;
    confirmed: number;
    cancelled: number;
    averageTicket: number;
    totalRevenue: number;
  };
  times: {
    avgConfirmation: number;
    avgPreparation: number;
    avgTotal: number;
    preparationSla: number;
  };
  calls: {
    total: number;
    waiter: number;
    bill: number;
    avgServiceTime: number;
  };
  satisfaction: {
    averageRating: number;
    totalReviews: number;
    reviewRate: number;
  };
}

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color: "blue" | "green" | "yellow" | "red" | "purple";
}

function KPICard({ title, value, subtitle, icon, trend, color }: KPICardProps) {
  const colorClasses = {
    blue: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400",
    green:
      "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400",
    yellow:
      "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400",
    red: "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400",
    purple:
      "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400",
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>{icon}</div>
        {trend && (
          <div
            className={`flex items-center text-sm ${trend.isPositive ? "text-green-600" : "text-red-600"}`}
          >
            <TrendingUp
              className={`w-4 h-4 mr-1 ${!trend.isPositive ? "rotate-180" : ""}`}
            />
            {trend.value}%
          </div>
        )}
      </div>
      <div className="mt-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
          {value}
        </p>
        {subtitle && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}

function formatCurrency(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatMinutes(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

interface MetricsOverviewProps {
  period?: string;
  restaurantId?: string;
}

export function MetricsOverview({
  period = "today",
  restaurantId,
}: MetricsOverviewProps) {
  const t = useTranslations("admin.metrics");
  const locale = useLocale();
  const [data, setData] = useState<MetricsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const params = new URLSearchParams({ period });
        if (restaurantId) {
          params.set("restaurantId", restaurantId);
        }
        const response = await fetch(
          `/api/admin/metrics/summary?${params.toString()}`,
        );
        if (!response.ok) throw new Error("Failed to load metrics");
        const result = await response.json();
        setData(result);
      } catch {
        setError(t("loadError"));
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [period, restaurantId, t]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 animate-pulse"
          >
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg" />
            </div>
            <div className="mt-4">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24" />
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-32 mt-2" />
            </div>
          </div>
        ))}
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
    <div className="space-y-6">
      {/* Orders */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t("orders")}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title={t("totalOrders")}
            value={data.orders.total}
            icon={<ShoppingCart className="w-6 h-6" />}
            color="blue"
          />
          <KPICard
            title={t("confirmedOrders")}
            value={data.orders.confirmed}
            subtitle={`${data.orders.total > 0 ? Math.round((data.orders.confirmed / data.orders.total) * 100) : 0}% ${t("ofTotal")}`}
            icon={<CheckCircle className="w-6 h-6" />}
            color="green"
          />
          <KPICard
            title={t("canceledOrders")}
            value={data.orders.cancelled}
            subtitle={`${data.orders.total > 0 ? Math.round((data.orders.cancelled / data.orders.total) * 100) : 0}% ${t("ofTotal")}`}
            icon={<XCircle className="w-6 h-6" />}
            color="red"
          />
          <KPICard
            title={t("averageTicket")}
            value={formatCurrency(data.orders.averageTicket, locale)}
            subtitle={`${t("totalRevenue")}: ${formatCurrency(data.orders.totalRevenue, locale)}`}
            icon={<DollarSign className="w-6 h-6" />}
            color="green"
          />
        </div>
      </div>

      {/* Times */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t("times")}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title={t("avgConfirmation")}
            value={formatMinutes(data.times.avgConfirmation)}
            icon={<Clock className="w-6 h-6" />}
            color="blue"
          />
          <KPICard
            title={t("avgPreparation")}
            value={formatMinutes(data.times.avgPreparation)}
            icon={<Clock className="w-6 h-6" />}
            color="yellow"
          />
          <KPICard
            title={t("avgTotal")}
            value={formatMinutes(data.times.avgTotal)}
            icon={<Clock className="w-6 h-6" />}
            color="purple"
          />
          <KPICard
            title={t("preparationSLA")}
            value={`${data.times.preparationSla}%`}
            subtitle={t("under30min")}
            icon={<TrendingUp className="w-6 h-6" />}
            color="green"
          />
        </div>
      </div>

      {/* Calls and satisfaction */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t("callsAndSatisfaction")}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title={t("totalCalls")}
            value={data.calls.total}
            subtitle={`${t("waiter")}: ${data.calls.waiter} | ${t("bill")}: ${data.calls.bill}`}
            icon={<Bell className="w-6 h-6" />}
            color="yellow"
          />
          <KPICard
            title={t("avgServiceTime")}
            value={formatMinutes(data.calls.avgServiceTime)}
            icon={<Clock className="w-6 h-6" />}
            color="blue"
          />
          <KPICard
            title={t("avgRating")}
            value={data.satisfaction.averageRating.toFixed(1)}
            subtitle={`${data.satisfaction.totalReviews} ${t("reviews")}`}
            icon={<Star className="w-6 h-6" />}
            color="yellow"
          />
          <KPICard
            title={t("reviewRate")}
            value={`${data.satisfaction.reviewRate}%`}
            icon={<TrendingUp className="w-6 h-6" />}
            color="purple"
          />
        </div>
      </div>
    </div>
  );
}
