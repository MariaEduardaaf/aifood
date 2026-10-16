import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TodayDashboard } from "@/components/admin/today-dashboard";

export default async function TodayPage() {
  const session = await auth();

  if (
    !session ||
    (session.user.role !== "ADMIN" && session.user.role !== "MANAGER")
  ) {
    redirect("/waiter");
  }

  return <TodayDashboard />;
}
