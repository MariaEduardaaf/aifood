import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { UsersManager } from "@/components/admin/users-manager";
import { RestaurantRequired } from "@/components/superadmin/restaurant-required";

interface UsuariosPageProps {
  searchParams: {
    restaurantId?: string;
  };
}

export default async function UsuariosPage({ searchParams }: UsuariosPageProps) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const restaurantId = searchParams.restaurantId;

  if (!restaurantId) {
    return <RestaurantRequired />;
  }

  return (
    <UsersManager
      currentUserId={session.user.id}
      restaurantId={restaurantId}
    />
  );
}
