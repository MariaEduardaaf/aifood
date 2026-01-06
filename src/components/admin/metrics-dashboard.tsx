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
  Bell,
  Clock,
  CheckCircle,
  TrendingUp,
  Loader2,
  BarChart3,
  Star,
  ExternalLink,
  MessageSquare,
} from "lucide-react";
import { formatTime } from "@/lib/utils";

interface Metrics {
  period: string;
  totalCalls: number;
  openCalls: number;
  resolvedCalls: number;
  callsByType: Record<string, number>;
  avgResponseTime: number;
  slaPercentage: number;
  callsByHour: Record<number, number>;
  callsByTable: Array<{ tableId: string; label: string; count: number }>;
  callsByWaiter: Array<{ resolvedBy: string; name: string; count: number }>;
  ratings: {
    total: number;
    average: number;
    googleRedirects: number;
    negativeFeedbacks: number;
    distribution: Record<number, number>;
  };
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
      const res = await fetch(`/api/metricas?period=${period}`);
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch (err) {
      console.error("Error fetching metrics:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Erro ao carregar métricas
      </div>
    );
  }

  const maxHourValue = Math.max(...Object.values(metrics.callsByHour || {}), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("metrics")}</h1>
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("totalCalls")}
            </CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.totalCalls}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.openCalls} aberto(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("avgResponseTime")}
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono">
              {formatTime(metrics.avgResponseTime)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.resolvedCalls} resolvido(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("slaPercentage")}
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-3xl font-bold ${
                metrics.slaPercentage >= 80
                  ? "text-green-600"
                  : metrics.slaPercentage >= 60
                    ? "text-yellow-600"
                    : "text-red-600"
              }`}
            >
              {metrics.slaPercentage}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">Meta: 80%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Por Tipo
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-sm">Garçom</span>
                <span className="font-bold">
                  {metrics.callsByType.CALL_WAITER || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Conta</span>
                <span className="font-bold">
                  {metrics.callsByType.REQUEST_BILL || 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calls by Hour */}
        {period === "today" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                {t("callsByHour")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-1 h-40">
                {Array.from({ length: 24 }, (_, hour) => {
                  const count = metrics.callsByHour[hour] || 0;
                  const height =
                    maxHourValue > 0 ? (count / maxHourValue) * 100 : 0;
                  const currentHour = new Date().getHours();

                  return (
                    <div
                      key={hour}
                      className="flex-1 flex flex-col items-center gap-1"
                    >
                      <div
                        className={`w-full rounded-t transition-all ${
                          hour === currentHour ? "bg-primary" : "bg-primary/60"
                        }`}
                        style={{ height: `${Math.max(height, 2)}%` }}
                        title={`${hour}h: ${count} chamado(s)`}
                      />
                      {hour % 4 === 0 && (
                        <span className="text-[10px] text-muted-foreground">
                          {hour}h
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top Tables */}
        <Card>
          <CardHeader>
            <CardTitle>Mesas com mais chamados</CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.callsByTable.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                Nenhum dado disponível
              </p>
            ) : (
              <div className="space-y-3">
                {metrics.callsByTable.slice(0, 5).map((item, index) => (
                  <div key={item.tableId} className="flex items-center gap-3">
                    <span className="text-lg font-bold text-muted-foreground w-6">
                      {index + 1}.
                    </span>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="font-medium">{item.label}</span>
                        <span className="text-muted-foreground">
                          {item.count}
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{
                            width: `${(item.count / metrics.callsByTable[0].count) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Waiters */}
        <Card>
          <CardHeader>
            <CardTitle>Garçons mais ativos</CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.callsByWaiter.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                Nenhum dado disponível
              </p>
            ) : (
              <div className="space-y-3">
                {metrics.callsByWaiter.slice(0, 5).map((item, index) => (
                  <div
                    key={item.resolvedBy || index}
                    className="flex items-center gap-3"
                  >
                    <span className="text-lg font-bold text-muted-foreground w-6">
                      {index + 1}.
                    </span>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="font-medium">{item.name}</span>
                        <span className="text-muted-foreground">
                          {item.count} resolvido(s)
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full"
                          style={{
                            width: `${(item.count / metrics.callsByWaiter[0].count) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Ratings Section */}
      {metrics.ratings && (
        <>
          <h2 className="text-xl font-bold mt-8 flex items-center gap-2">
            <Star className="h-5 w-5 text-primary" />
            Avaliações dos Clientes
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total de Avaliações
                </CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {metrics.ratings.total}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  no período selecionado
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Média de Estrelas
                </CardTitle>
                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold flex items-center gap-2">
                  {metrics.ratings.average.toFixed(1)}
                  <Star className="h-6 w-6 text-yellow-500 fill-yellow-500" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  de 5.0 possíveis
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Enviados ao Google
                </CardTitle>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {metrics.ratings.googleRedirects}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {metrics.ratings.total > 0
                    ? `${Math.round((metrics.ratings.googleRedirects / metrics.ratings.total) * 100)}% das avaliações`
                    : "nenhuma avaliação ainda"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Feedbacks Negativos
                </CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-500">
                  {metrics.ratings.negativeFeedbacks}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  para análise interna
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Rating Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Distribuição das Avaliações
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = metrics.ratings.distribution[star] || 0;
                  const percentage =
                    metrics.ratings.total > 0
                      ? (count / metrics.ratings.total) * 100
                      : 0;

                  return (
                    <div key={star} className="flex items-center gap-3">
                      <div className="flex items-center gap-1 w-16">
                        <span className="font-medium">{star}</span>
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      </div>
                      <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            star >= 4
                              ? "bg-green-500"
                              : star === 3
                                ? "bg-yellow-500"
                                : "bg-red-500"
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground w-20 text-right">
                        {count} ({percentage.toFixed(0)}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
