import { SettingsForm } from "@/components/admin/settings-form";
import { RestaurantRequired } from "@/components/superadmin/restaurant-required";

interface SettingsPageProps {
  searchParams: {
    restaurantId?: string;
  };
}

export default function SettingsPage({ searchParams }: SettingsPageProps) {
  const restaurantId = searchParams.restaurantId;

  if (!restaurantId) {
    return <RestaurantRequired />;
  }

  return <SettingsForm restaurantId={restaurantId} />;
}
