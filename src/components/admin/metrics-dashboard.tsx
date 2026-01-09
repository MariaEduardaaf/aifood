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
  Clock,
  Users,
  Star,
  XCircle,
  TrendingUp,
  Bell,
  Receipt,
  Package,
} from "lucide-react";

interface Metrics {
  pedidos: {
    total: number;
    confirmados: number;
    cancelados: number;
    taxaCancelamento: number;
    ticketMedio: number;
    receitaTotal: number;
  };
  tempos: {
    mediaConfirmacao: number;
    mediaPreparo: number;
    mediaTotal: number;
    slaPreparo: number;
    pedidosAtrasados: number;
  };
  chamados: {
    total: number;
    garcom: number;
    conta: number;
    tempoMedioAtendimento: number;
  };
  satisfacao: {
    notaMedia: number;
    totalAvaliacoes: number;
    taxaAvaliacao: number;
  };
}

interface TopProduct {
  id: string;
  name: string;
  quantity: number;
  revenue: number;
}

export function MetricsDashboard() {
  const t = useTranslations("admin");

  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"today" | "week" | "month">("today");

  useEffect(() => {
    fetchMetrics();
    fetchTopProducts();
  }, [period]);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const periodMap = { today: "today", week: "week", month: "month" };
      const res = await fetch(
        `/api/admin/metricas/resumo?periodo=${periodMap[period]}`,
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
  };

  const fetchTopProducts = async () => {
    try {
      const periodMap = { today: "today", week: "week", month: "month" };
      const res = await fetch(
        `/api/admin/metricas/produtos/top?periodo=${periodMap[period]}&limite=5`,
      );
      if (res.ok) {
        const data = await res.json();
        // API retorna { dados: [...] }
        const produtos = data.dados || [];
        setTopProducts(
          produtos.map((p: any) => ({
            id: p.id,
            name: p.nome,
            quantity: p.quantidade,
            revenue: p.receita,
          })),
        );
      }
    } catch (err) {
      console.error("Error fetching top products:", err);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
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

      {/* Cards principais - Pedidos e Faturamento */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total de Pedidos */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Pedidos
            </CardTitle>
            <ShoppingBag className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {metrics?.pedidos.total || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics?.pedidos.confirmados || 0} confirmados
            </p>
          </CardContent>
        </Card>

        {/* Faturamento */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Faturamento
            </CardTitle>
            <DollarSign className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-500">
              {formatCurrency(metrics?.pedidos.receitaTotal || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Ticket médio: {formatCurrency(metrics?.pedidos.ticketMedio || 0)}
            </p>
          </CardContent>
        </Card>

        {/* Taxa de Cancelamento */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cancelamentos
            </CardTitle>
            <XCircle className="h-5 w-5 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {metrics?.pedidos.cancelados || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics?.pedidos.taxaCancelamento || 0}% do total
            </p>
          </CardContent>
        </Card>

        {/* Avaliação Média */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avaliação Média
            </CardTitle>
            <Star className="h-5 w-5 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold">
                {metrics?.satisfacao.notaMedia || 0}
              </span>
              {renderStars(Math.round(metrics?.satisfacao.notaMedia || 0))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics?.satisfacao.totalAvaliacoes || 0} avaliações
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Segunda linha - Tempos e Chamados */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Tempos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Tempos de Operação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-sm text-muted-foreground">Confirmação</p>
                <p className="text-xl font-bold">
                  {formatTime(metrics?.tempos.mediaConfirmacao || 0)}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-sm text-muted-foreground">Preparo</p>
                <p className="text-xl font-bold">
                  {formatTime(metrics?.tempos.mediaPreparo || 0)}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-sm text-muted-foreground">
                  Total (até entrega)
                </p>
                <p className="text-xl font-bold">
                  {formatTime(metrics?.tempos.mediaTotal || 0)}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-sm text-muted-foreground">
                  SLA Preparo (&lt;15min)
                </p>
                <p
                  className={`text-xl font-bold ${
                    (metrics?.tempos.slaPreparo || 0) >= 80
                      ? "text-green-500"
                      : (metrics?.tempos.slaPreparo || 0) >= 60
                        ? "text-yellow-500"
                        : "text-red-500"
                  }`}
                >
                  {metrics?.tempos.slaPreparo || 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Chamados */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Chamados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-xl font-bold">
                  {metrics?.chamados.total || 0}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-sm text-muted-foreground">Tempo Médio</p>
                <p className="text-xl font-bold">
                  {formatTime(metrics?.chamados.tempoMedioAtendimento || 0)}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-500" />
                  <p className="text-sm text-muted-foreground">Garçom</p>
                </div>
                <p className="text-xl font-bold text-blue-500">
                  {metrics?.chamados.garcom || 0}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-green-500" />
                  <p className="text-sm text-muted-foreground">Conta</p>
                </div>
                <p className="text-xl font-bold text-green-500">
                  {metrics?.chamados.conta || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Produtos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Top 5 Produtos Mais Vendidos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topProducts.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum produto vendido no período
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
                        {product.quantity} vendidos
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
      {metrics?.pedidos.total === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>Nenhum pedido no período selecionado</p>
        </div>
      )}
    </div>
  );
}
