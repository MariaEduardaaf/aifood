"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
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
import { useCurrency } from "@/components/providers/currency";

interface DayData {
  day: number;
  key: string;
  quantity: number;
  revenue: number;
}

interface OrdersByDayChartProps {
  period?: string;
  restaurantId?: string;
}

export function OrdersByDayChart({
  period = "week",
  restaurantId,
}: OrdersByDayChartProps) {
  const t = useTranslations("admin.metrics");
  const locale = useLocale();
  const [data, setData] = useState<DayData[]>([]);
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
          `/api/admin/metrics/orders/weekday?${params.toString()}`,
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

  const dayNames: Record<string, string> = {
    sunday: t("sunday"),
    monday: t("monday"),
    tuesday: t("tuesday"),
    wednesday: t("wednesday"),
    thursday: t("thursday"),
    friday: t("friday"),
    saturday: t("saturday"),
  };

  const translatedData = data.map((item) => ({
    ...item,
    displayName: dayNames[item.key] || item.key,
  }));

  return (
    <div className="bg-card rounded-lg shadow-sm border border-border p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">
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
              className="stroke-border"
            />
            <XAxis
              dataKey="displayName"
              className="text-muted-foreground"
              tick={{ fill: "currentColor" }}
            />
            <YAxis
              yAxisId="left"
              className="text-muted-foreground"
              tick={{ fill: "currentColor" }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tickFormatter={(value) => formatCurrency(value)}
              className="text-muted-foreground"
              tick={{ fill: "currentColor" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                borderColor: "hsl(var(--border))",
                borderRadius: "8px",
              }}
              formatter={(value, name) => {
                if (name === "revenue")
                  return [formatCurrency(value as number), t("revenue")];
                return [value as number, t("orders")];
              }}
            />
            <Legend
              formatter={(value) =>
                value === "quantity" ? t("orders") : t("revenue")
              }
            />
            <Bar
              yAxisId="left"
              dataKey="quantity"
              fill="#8b5cf6"
              radius={[4, 4, 0, 0]}
              name="quantity"
            />
            <Bar
              yAxisId="right"
              dataKey="revenue"
              fill="#f59e0b"
              radius={[4, 4, 0, 0]}
              name="revenue"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
