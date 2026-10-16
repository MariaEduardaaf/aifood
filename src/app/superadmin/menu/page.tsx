import { MenuManager } from "@/components/admin/menu-manager";
import { RestaurantRequired } from "@/components/superadmin/restaurant-required";

interface MenuPageProps {
  searchParams: {
    restaurantId?: string;
  };
}

export default function MenuPage({ searchParams }: MenuPageProps) {
  const restaurantId = searchParams.restaurantId;

  if (!restaurantId) {
    return <RestaurantRequired />;
  }

  return <MenuManager restaurantId={restaurantId} />;
}
