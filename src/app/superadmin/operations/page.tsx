import { OperationsPanel } from "@/components/superadmin/operations-panel";
import { RestaurantRequired } from "@/components/superadmin/restaurant-required";

interface OperationsPageProps {
  searchParams: {
    restaurantId?: string;
  };
}

export default function OperationsPage({ searchParams }: OperationsPageProps) {
  const restaurantId = searchParams.restaurantId;

  if (!restaurantId) {
    return <RestaurantRequired />;
  }

  return <OperationsPanel restaurantId={restaurantId} />;
}
