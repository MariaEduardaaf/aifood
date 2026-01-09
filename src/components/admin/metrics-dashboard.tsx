"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
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
  ArrowUp,
  ArrowDown,
} from "lucide-react";

interface Metrics {
  totalOrders: number;
  totalRevenue: number;
  ordersChange?: number;
  revenueChange?: number;
}

export function MetricsDashboard() {
  const t = useTranslations("admin");

  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"today" | "week" | "month">("today");

  useEffect(() => {
    fetchMetrics();
  }, [period]);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/metricas/resumo?period=${period}`);
      if (res.ok) {
        const data = await res.json();
        setMetrics({
          totalOrders: data.orders?.total || 0,
          totalRevenue: data.orders?.revenue || 0,
          ordersChange: data.orders?.change,
          revenueChange: data.orders?.revenueChange,
        });
      }
    } catch (err) {
      console.error("Error fetching metrics:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
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
          <h1 className="text-2xl font-bold">{t("metrics")}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Acompanhe o desempenho do seu restaurante
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

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Total de Pedidos */}
        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Pedidos
            </CardTitle>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <ShoppingBag className="h-5 w-5 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">
              {metrics?.totalOrders || 0}
            </div>
            {metrics?.ordersChange !== undefined && (
              <div
                className={`flex items-center gap-1 mt-2 text-sm ${
                  metrics.ordersChange >= 0 ? "text-green-500" : "text-red-500"
                }`}
              >
                {metrics.ordersChange >= 0 ? (
                  <ArrowUp className="h-4 w-4" />
                ) : (
                  <ArrowDown className="h-4 w-4" />
                )}
                <span>
                  {metrics.ordersChange >= 0 ? "+" : ""}
                  {metrics.ordersChange}% vs período anterior
                </span>
              </div>
            )}
          </CardContent>
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16" />
        </Card>

        {/* Faturamento */}
        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Faturamento
            </CardTitle>
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-green-500">
              {formatCurrency(metrics?.totalRevenue || 0)}
            </div>
            {metrics?.revenueChange !== undefined && (
              <div
                className={`flex items-center gap-1 mt-2 text-sm ${
                  metrics.revenueChange >= 0 ? "text-green-500" : "text-red-500"
                }`}
              >
                {metrics.revenueChange >= 0 ? (
                  <ArrowUp className="h-4 w-4" />
                ) : (
                  <ArrowDown className="h-4 w-4" />
                )}
                <span>
                  {metrics.revenueChange >= 0 ? "+" : ""}
                  {metrics.revenueChange}% vs período anterior
                </span>
              </div>
            )}
          </CardContent>
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full -mr-16 -mt-16" />
        </Card>
      </div>

      {/* Empty state quando não há dados */}
      {metrics?.totalOrders === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>Nenhum pedido no período selecionado</p>
        </div>
      )}
    </div>
  );
}
