import { getTranslations } from "next-intl/server";
import { Card, CardContent } from "@/components/ui";

interface RestaurantRequiredProps {
  title?: string;
  description?: string;
}

export async function RestaurantRequired({
  title,
  description,
}: RestaurantRequiredProps) {
  const t = await getTranslations("superadmin.restaurantRequired");

  return (
    <Card>
      <CardContent className="py-12 text-center text-muted-foreground">
        <p className="text-lg font-semibold text-foreground">{title ?? t("title")}</p>
        <p className="mt-2">{description ?? t("description")}</p>
      </CardContent>
    </Card>
  );
}
