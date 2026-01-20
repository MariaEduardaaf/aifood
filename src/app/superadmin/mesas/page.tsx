import { TablesManager } from "@/components/admin/tables-manager";
import { RestaurantRequired } from "@/components/superadmin/restaurant-required";

interface MesasPageProps {
  searchParams: {
    restaurantId?: string;
  };
}

export default function MesasPage({ searchParams }: MesasPageProps) {
  const restaurantId = searchParams.restaurantId;

  if (!restaurantId) {
    return <RestaurantRequired />;
  }

  return <TablesManager restaurantId={restaurantId} />;
}
