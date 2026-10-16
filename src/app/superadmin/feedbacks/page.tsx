import { getTranslations } from "next-intl/server";
import { FeedbacksPage } from "@/components/admin/feedbacks-page";
import { RestaurantRequired } from "@/components/superadmin/restaurant-required";

interface FeedbacksSuperAdminPageProps {
  searchParams: {
    restaurantId?: string;
  };
}

export default async function FeedbacksSuperAdminPage({ searchParams }: FeedbacksSuperAdminPageProps) {
  const t = await getTranslations("superadmin.restaurantRequired");
  const restaurantId = searchParams.restaurantId;

  if (!restaurantId) {
    return (
      <RestaurantRequired description={t("feedbacksDescription")} />
    );
  }

  return <FeedbacksPage restaurantId={restaurantId} />;
}
