import { OperationsPanel } from "@/components/superadmin/operations-panel";
import { RestaurantRequired } from "@/components/superadmin/restaurant-required";

interface OperacaoPageProps {
  searchParams: {
    restaurantId?: string;
  };
}

export default function OperacaoPage({ searchParams }: OperacaoPageProps) {
  const restaurantId = searchParams.restaurantId;

  if (!restaurantId) {
    return <RestaurantRequired />;
  }

  return <OperationsPanel restaurantId={restaurantId} />;
}
