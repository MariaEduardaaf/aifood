"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
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
  pedidosAtivos: {
    pendentes: number;
    confirmados: number;
    preparando: number;
    prontos: number;
  };
  chamadosAbertos: number;
  mesasOcupadas: number;
  ultimosPedidos: Array<{
    id: string;
    mesa: number;
    status: string;
    total: number;
    criadoEm: string;
  }>;
  alertas: Array<{
    tipo: string;
    mensagem: string;
    pedidoId?: string;
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
        ? `/api/admin/metricas/tempo-real?${params.toString()}`
        : "/api/admin/metricas/tempo-real";
      const response = await fetch(url);
      if (!response.ok) throw new Error("Erro ao carregar dados");
      const result = await response.json();
      setData(result);
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
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
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("pt-BR", {
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

      {/* Status dos Pedidos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
            {data.pedidosAtivos.pendentes}
          </p>
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            {t("pending")}
          </p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {data.pedidosAtivos.confirmados}
          </p>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            {t("confirmed")}
          </p>
        </div>
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            {data.pedidosAtivos.preparando}
          </p>
          <p className="text-sm text-orange-700 dark:text-orange-300">
            {t("preparing")}
          </p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {data.pedidosAtivos.prontos}
          </p>
          <p className="text-sm text-green-700 dark:text-green-300">
            {t("ready")}
          </p>
        </div>
      </div>

      {/* Indicadores Rápidos */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <Bell className="w-5 h-5 text-yellow-500" />
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("openCalls")}
            </p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {data.chamadosAbertos}
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
              {data.mesasOcupadas}
            </p>
          </div>
        </div>
      </div>

      {/* Alertas */}
      {data.alertas.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            {t("alerts")}
          </h4>
          <div className="space-y-2">
            {data.alertas.map((alerta, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
              >
                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-700 dark:text-red-300">
                  {alerta.mensagem}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Últimos Pedidos */}
      <div>
        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <Utensils className="w-4 h-4" />
          {t("recentOrders")}
        </h4>
        <div className="space-y-2">
          {data.ultimosPedidos.map((pedido) => (
            <div
              key={pedido.id}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {pedido.mesa}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {t("table")} {pedido.mesa}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatTime(pedido.criadoEm)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(pedido.status)}`}
                >
                  {getStatusLabel(pedido.status)}
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {formatCurrency(pedido.total)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
