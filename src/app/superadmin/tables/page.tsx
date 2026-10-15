import { TablesManager } from "@/components/admin/tables-manager";
import { RestaurantRequired } from "@/components/superadmin/restaurant-required";

interface TablesPageProps {
  searchParams: {
    restaurantId?: string;
  };
}

export default function TablesPage({ searchParams }: TablesPageProps) {
  const restaurantId = searchParams.restaurantId;

  if (!restaurantId) {
    return <RestaurantRequired />;
  }

  return <TablesManager restaurantId={restaurantId} />;
}
