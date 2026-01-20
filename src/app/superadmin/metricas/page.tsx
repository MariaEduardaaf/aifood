import { MetricsDashboard } from "@/components/admin/metrics-dashboard";
import { RestaurantRequired } from "@/components/superadmin/restaurant-required";

interface MetricasPageProps {
  searchParams: {
    restaurantId?: string;
  };
}

export default function MetricasPage({ searchParams }: MetricasPageProps) {
  const restaurantId = searchParams.restaurantId;

  if (!restaurantId) {
    return (
      <RestaurantRequired description="Selecione um restaurante para ver as metricas." />
    );
  }

  return <MetricsDashboard restaurantId={restaurantId} />;
}
