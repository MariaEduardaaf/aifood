import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AdminPage() {
  const session = await auth();

  if (
    !session ||
    (session.user.role !== "ADMIN" && session.user.role !== "MANAGER")
  ) {
    redirect("/waiter");
  }

  redirect("/admin/today");
}
