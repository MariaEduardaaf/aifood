"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useCurrency } from "@/components/providers/currency";

interface CategoryData {
  id: string;
  name: string;
  orders: number;
  items: number;
  revenue: number;
  percentage: number;
}

interface CategoriesChartProps {
  period?: string;
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
];

export function CategoriesChart({
  period = "today",
  restaurantId,
}: CategoriesChartProps) {
  const t = useTranslations("admin.metrics");
  const locale = useLocale();
  const [data, setData] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currency = useCurrency(restaurantId);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const params = new URLSearchParams({ period });
        if (restaurantId) {
          params.set("restaurantId", restaurantId);
        }
        const response = await fetch(
          `/api/admin/metrics/categories?${params.toString()}`,
        );
        if (!response.ok) throw new Error("Failed to load data");
        const result = await response.json();
        setData(result.data);
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
      <div className="bg-card rounded-lg shadow-sm border border-border p-6">
        <div className="h-6 bg-muted rounded w-48 mb-4 animate-pulse" />
        <div className="h-80 bg-muted rounded animate-pulse" />
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
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(value);
  };

  const totalRevenue = data.reduce((sum, cat) => sum + cat.revenue, 0);

  return (
    <div className="bg-card rounded-lg shadow-sm border border-border p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">
        {t("revenueByCategory")}
      </h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie chart */}
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data as unknown as Record<string, unknown>[]}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="revenue"
                nameKey="name"
                label={false}
                labelLine={false}
              >
                {data.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  borderColor: "hsl(var(--border))",
                  borderRadius: "8px",
                }}
                formatter={(value) => [
                  formatCurrency(value as number),
                  t("revenue"),
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Category list */}
        <div className="space-y-3">
          <div className="text-center mb-4">
            <p className="text-sm text-muted-foreground">
              {t("totalRevenue")}
            </p>
            <p className="text-2xl font-bold text-foreground">
              {formatCurrency(totalRevenue)}
            </p>
          </div>

          {data.map((category, index) => (
            <div
              key={category.id}
              className="flex items-center gap-3 p-3 bg-secondary/40 rounded-lg"
            >
              <div
                className="w-4 h-4 rounded-full flex-shrink-0"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground truncate">
                    {category.name}
                  </p>
                  <p className="text-sm font-semibold text-foreground ml-2">
                    {category.percentage}%
                  </p>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-muted-foreground">
                    {category.items} {t("items")} • {category.orders}{" "}
                    {t("orders")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(category.revenue)}
                  </p>
                </div>
                {/* Progress bar */}
                <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${category.percentage}%`,
                      backgroundColor: COLORS[index % COLORS.length],
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
