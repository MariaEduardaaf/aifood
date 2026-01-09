import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AdminPage() {
  const session = await auth();

  if (
    !session ||
    (session.user.role !== "ADMIN" && session.user.role !== "MANAGER")
  ) {
    redirect("/garcom");
  }

  // Redireciona para a página de mesas
  redirect("/admin/mesas");
}
