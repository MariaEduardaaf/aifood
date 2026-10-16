"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
} from "@/components/ui";
import {
  ShoppingBag,
  DollarSign,
  Loader2,
  Clock,
  Users,
  Star,
  XCircle,
  Bell,
  Receipt,
  Package,
} from "lucide-react";
import { useCurrency } from "@/components/providers/currency";
import { formatPercent } from "./format";

interface Metrics {
  orders: {
    total: number;
    confirmed: number;
    cancelled: number;
    cancellationRate: number;
    averageTicket: number;
    totalRevenue: number;
  };
  times: {
    avgConfirmation: number;
    avgPreparation: number;
    avgTotal: number;
    preparationSla: number;
    delayedOrders: number;
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

interface TopProduct {
  id: string;
  name: string;
  quantity: number;
  revenue: number;
}

interface MetricsDashboardProps {
  restaurantId?: string;
}

export function MetricsDashboard({ restaurantId }: MetricsDashboardProps) {
  const t = useTranslations("admin");
  const locale = useLocale();

  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"today" | "week" | "month">("today");

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    try {
      const periodMap = { today: "today", week: "week", month: "month" };
      const params = new URLSearchParams({
        period: periodMap[period],
      });
      if (restaurantId) {
        params.set("restaurantId", restaurantId);
      }
      const res = await fetch(
        `/api/admin/metrics/summary?${params.toString()}`,
      );
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch (err) {
      console.error("Error fetching metrics:", err);
    } finally {
      setLoading(false);
    }
  }, [period, restaurantId]);

  const fetchTopProducts = useCallback(async () => {
    try {
      const periodMap = { today: "today", week: "week", month: "month" };
      const params = new URLSearchParams({
        period: periodMap[period],
        limit: "5",
      });
      if (restaurantId) {
        params.set("restaurantId", restaurantId);
      }
      const res = await fetch(
        `/api/admin/metrics/products/top?${params.toString()}`,
      );
      if (res.ok) {
        const data = await res.json();
        // API returns { data: [...] }
        setTopProducts(data.data || []);
      }
    } catch (err) {
      console.error("Error fetching top products:", err);
    }
  }, [period, restaurantId]);

  useEffect(() => {
    fetchMetrics();
    fetchTopProducts();
  }, [fetchMetrics, fetchTopProducts]);

  const currency = useCurrency(restaurantId);
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
    }).format(value);
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (minutes < 60) return `${minutes}m ${secs}s`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t("metricsPage")}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t("metricsDashboard.subtitle")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={period === "today" ? "default" : "outline"}
            size="sm"
            onClick={() => setPeriod("today")}
          >
            {t("today")}
          </Button>
          <Button
            variant={period === "week" ? "default" : "outline"}
            size="sm"
            onClick={() => setPeriod("week")}
          >
            {t("thisWeek")}
          </Button>
          <Button
            variant={period === "month" ? "default" : "outline"}
            size="sm"
            onClick={() => setPeriod("month")}
          >
            {t("thisMonth")}
          </Button>
        </div>
      </div>

      {/* Main cards: orders and revenue */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("metrics.totalOrders")}
            </CardTitle>
            <ShoppingBag className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {metrics?.orders.total || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("metricsDashboard.confirmedCount", { count: metrics?.orders.confirmed || 0 })}
            </p>
          </CardContent>
        </Card>

        {/* Revenue */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("metricsDashboard.revenue")}
            </CardTitle>
            <DollarSign className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-500">
              {formatCurrency(metrics?.orders.totalRevenue || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("metricsDashboard.avgTicket", { value: formatCurrency(metrics?.orders.averageTicket || 0) })}
            </p>
          </CardContent>
        </Card>

        {/* Cancellation rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("metricsDashboard.cancellations")}
            </CardTitle>
            <XCircle className="h-5 w-5 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {metrics?.orders.cancelled || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("metricsDashboard.percentOfTotal", { percent: metrics?.orders.cancellationRate || 0 })}
            </p>
          </CardContent>
        </Card>

        {/* Average rating */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("metrics.avgRating")}
            </CardTitle>
            <Star className="h-5 w-5 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold">
                {metrics?.satisfaction.averageRating || 0}
              </span>
              {renderStars(Math.round(metrics?.satisfaction.averageRating || 0))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("metricsDashboard.reviewsCount", { count: metrics?.satisfaction.totalReviews || 0 })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Second row: times and calls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Times */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              {t("metricsDashboard.operationTimes")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-sm text-muted-foreground">{t("metricsDashboard.confirmation")}</p>
                <p className="text-xl font-bold">
                  {formatTime(metrics?.times.avgConfirmation || 0)}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-sm text-muted-foreground">{t("metricsDashboard.preparation")}</p>
                <p className="text-xl font-bold">
                  {formatTime(metrics?.times.avgPreparation || 0)}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-sm text-muted-foreground">
                  {t("metricsDashboard.totalUntilDelivery")}
                </p>
                <p className="text-xl font-bold">
                  {formatTime(metrics?.times.avgTotal || 0)}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-sm text-muted-foreground">
                  {t("metricsDashboard.prepSla")}
                </p>
                <p
                  className={`text-xl font-bold ${
                    (metrics?.times.preparationSla || 0) >= 80
                      ? "text-green-500"
                      : (metrics?.times.preparationSla || 0) >= 60
                        ? "text-yellow-500"
                        : "text-red-500"
                  }`}
                >
                  {formatPercent(metrics?.times.preparationSla || 0, locale)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Calls */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              {t("metricsDashboard.calls")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-sm text-muted-foreground">{t("metricsDashboard.total")}</p>
                <p className="text-xl font-bold">
                  {metrics?.calls.total || 0}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-sm text-muted-foreground">{t("metricsDashboard.avgTime")}</p>
                <p className="text-xl font-bold">
                  {formatTime(metrics?.calls.avgServiceTime || 0)}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-500" />
                  <p className="text-sm text-muted-foreground">{t("metrics.waiter")}</p>
                </div>
                <p className="text-xl font-bold text-blue-500">
                  {metrics?.calls.waiter || 0}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-green-500" />
                  <p className="text-sm text-muted-foreground">{t("metrics.bill")}</p>
                </div>
                <p className="text-xl font-bold text-green-500">
                  {metrics?.calls.bill || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top products */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            {t("metricsDashboard.top5")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topProducts.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {t("metricsDashboard.noProductsSold")}
            </p>
          ) : (
            <div className="space-y-3">
              {topProducts.map((product, index) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/30"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        index === 0
                          ? "bg-yellow-500 text-white"
                          : index === 1
                            ? "bg-gray-400 text-white"
                            : index === 2
                              ? "bg-amber-600 text-white"
                              : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {t("metricsDashboard.soldCount", { count: product.quantity })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-500">
                      {formatCurrency(product.revenue)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Empty state */}
      {metrics?.orders.total === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>{t("metricsDashboard.noOrders")}</p>
        </div>
      )}
    </div>
  );
}
