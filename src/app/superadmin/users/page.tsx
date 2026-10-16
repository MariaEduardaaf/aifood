import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { UsersManager } from "@/components/admin/users-manager";
import { RestaurantRequired } from "@/components/superadmin/restaurant-required";

interface UsersPageProps {
  searchParams: {
    restaurantId?: string;
  };
}

export default async function UsersPage({ searchParams }: UsersPageProps) {
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
