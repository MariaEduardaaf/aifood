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
  Cell,
} from "recharts";

interface ProductData {
  id: string;
  nome: string;
  categoria: string;
  quantidade: number;
  receita: number;
  percentual: number;
}

interface TopProductsChartProps {
  periodo?: string;
  limit?: number;
  restaurantId?: string;
}

const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#6366f1",
  "#84cc16",
];

export function TopProductsChart({
  periodo = "hoje",
  limit = 10,
  restaurantId,
}: TopProductsChartProps) {
  const t = useTranslations("admin.metrics");
  const [data, setData] = useState<ProductData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const params = new URLSearchParams({ periodo, limite: String(limit) });
        if (restaurantId) {
          params.set("restaurantId", restaurantId);
        }
        const response = await fetch(
          `/api/admin/metricas/produtos/top?${params.toString()}`,
        );
        if (!response.ok) throw new Error("Erro ao carregar dados");
        const result = await response.json();
        setData(result.dados || result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro desconhecido");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [periodo, limit, restaurantId]);

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

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        {t("topProducts")}
      </h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              className="stroke-gray-200 dark:stroke-gray-700"
            />
            <XAxis
              type="number"
              className="text-gray-600 dark:text-gray-400"
              tick={{ fill: "currentColor" }}
            />
            <YAxis
              type="category"
              dataKey="nome"
              width={90}
              className="text-gray-600 dark:text-gray-400"
              tick={{ fill: "currentColor", fontSize: 12 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--tooltip-bg, #fff)",
                borderColor: "var(--tooltip-border, #e5e7eb)",
                borderRadius: "8px",
              }}
              formatter={(value, name, props) => {
                const item = props?.payload as ProductData | undefined;
                if (!item) return [value, ""];
                return [
                  `${t("quantity")}: ${item.quantidade} | ${t("revenue")}: ${formatCurrency(item.receita)} | ${t("category")}: ${item.categoria}`,
                  "",
                ];
              }}
              labelFormatter={(name) => name}
            />
            <Bar dataKey="quantidade" radius={[0, 4, 4, 0]}>
              {data.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Lista com detalhes */}
      <div className="mt-6 space-y-2">
        {data.slice(0, 5).map((product, index) => (
          <div
            key={product.id}
            className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {product.nome}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {product.categoria}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {product.quantidade} {t("units")}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formatCurrency(product.receita)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
