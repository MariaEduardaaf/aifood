import { getTranslations } from "next-intl/server";
import { MetricsDashboard } from "@/components/admin/metrics-dashboard";
import { RestaurantRequired } from "@/components/superadmin/restaurant-required";

interface MetricsPageProps {
  searchParams: {
    restaurantId?: string;
  };
}

export default async function MetricsPage({ searchParams }: MetricsPageProps) {
  const t = await getTranslations("superadmin.restaurantRequired");
  const restaurantId = searchParams.restaurantId;

  if (!restaurantId) {
    return (
      <RestaurantRequired description={t("metricsDescription")} />
    );
  }

  return <MetricsDashboard restaurantId={restaurantId} />;
}
