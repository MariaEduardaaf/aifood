import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { WaiterPage } from "@/components/waiter/waiter-page";

export default async function GarcomPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  return <WaiterPage userId={session.user.id} />;
}
