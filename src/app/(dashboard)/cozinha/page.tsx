import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { KitchenPage } from "@/components/kitchen/kitchen-page";

export default async function CozinhaPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  return <KitchenPage userId={session.user.id} userName={session.user.name || "Cozinha"} />;
}
