import { FeedbacksPage } from "@/components/admin/feedbacks-page";
import { RestaurantRequired } from "@/components/superadmin/restaurant-required";

interface FeedbacksSuperAdminPageProps {
  searchParams: {
    restaurantId?: string;
  };
}

export default function FeedbacksSuperAdminPage({
  searchParams,
}: FeedbacksSuperAdminPageProps) {
  const restaurantId = searchParams.restaurantId;

  if (!restaurantId) {
    return (
      <RestaurantRequired description="Selecione um restaurante para ver os feedbacks." />
    );
  }

  return <FeedbacksPage restaurantId={restaurantId} />;
}
