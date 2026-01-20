"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface DayData {
  dia: number;
  nome: string;
  quantidade: number;
  receita: number;
}

interface OrdersByDayChartProps {
  periodo?: string;
  restaurantId?: string;
}

export function OrdersByDayChart({
  periodo = "semana",
  restaurantId,
}: OrdersByDayChartProps) {
  const t = useTranslations("admin.metrics");
  const [data, setData] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const params = new URLSearchParams({ periodo });
        if (restaurantId) {
          params.set("restaurantId", restaurantId);
        }
        const response = await fetch(
          `/api/admin/metricas/pedidos/dia-semana?${params.toString()}`,
        );
        if (!response.ok) throw new Error("Erro ao carregar dados");
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro desconhecido");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [periodo, restaurantId]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-4 animate-pulse" />
        <div className="h-80 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const dayNames: Record<string, string> = {
    Domingo: t("sunday"),
    Segunda: t("monday"),
    Terça: t("tuesday"),
    Quarta: t("wednesday"),
    Quinta: t("thursday"),
    Sexta: t("friday"),
    Sábado: t("saturday"),
  };

  const translatedData = data.map((item) => ({
    ...item,
    nomeExibicao: dayNames[item.nome] || item.nome,
  }));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        {t("ordersByDay")}
      </h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={translatedData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              className="stroke-gray-200 dark:stroke-gray-700"
            />
            <XAxis
              dataKey="nomeExibicao"
              className="text-gray-600 dark:text-gray-400"
              tick={{ fill: "currentColor" }}
            />
            <YAxis
              yAxisId="left"
              className="text-gray-600 dark:text-gray-400"
              tick={{ fill: "currentColor" }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tickFormatter={(value) => formatCurrency(value)}
              className="text-gray-600 dark:text-gray-400"
              tick={{ fill: "currentColor" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--tooltip-bg, #fff)",
                borderColor: "var(--tooltip-border, #e5e7eb)",
                borderRadius: "8px",
              }}
              formatter={(value, name) => {
                if (name === "receita")
                  return [formatCurrency(value as number), t("revenue")];
                return [value as number, t("orders")];
              }}
            />
            <Legend
              formatter={(value) =>
                value === "quantidade" ? t("orders") : t("revenue")
              }
            />
            <Bar
              yAxisId="left"
              dataKey="quantidade"
              fill="#8b5cf6"
              radius={[4, 4, 0, 0]}
              name="quantidade"
            />
            <Bar
              yAxisId="right"
              dataKey="receita"
              fill="#f59e0b"
              radius={[4, 4, 0, 0]}
              name="receita"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
