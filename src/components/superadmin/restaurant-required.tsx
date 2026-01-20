import { Card, CardContent } from "@/components/ui";

interface RestaurantRequiredProps {
  title?: string;
  description?: string;
}

export function RestaurantRequired({
  title = "Selecione um restaurante",
  description = "Escolha um restaurante no seletor acima para continuar.",
}: RestaurantRequiredProps) {
  return (
    <Card>
      <CardContent className="py-12 text-center text-muted-foreground">
        <p className="text-lg font-semibold text-foreground">{title}</p>
        <p className="mt-2">{description}</p>
      </CardContent>
    </Card>
  );
}
