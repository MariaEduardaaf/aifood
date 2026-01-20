import { MenuManager } from "@/components/admin/menu-manager";
import { RestaurantRequired } from "@/components/superadmin/restaurant-required";

interface CardapioPageProps {
  searchParams: {
    restaurantId?: string;
  };
}

export default function CardapioPage({ searchParams }: CardapioPageProps) {
  const restaurantId = searchParams.restaurantId;

  if (!restaurantId) {
    return <RestaurantRequired />;
  }

  return <MenuManager restaurantId={restaurantId} />;
}
