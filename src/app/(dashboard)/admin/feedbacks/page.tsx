import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { FeedbacksPage } from "@/components/admin/feedbacks-page";

export default async function AdminFeedbacksPage() {
  const session = await auth();

  if (
    !session ||
    (session.user.role !== "ADMIN" && session.user.role !== "MANAGER")
  ) {
    redirect("/garcom");
  }

  return <FeedbacksPage />;
}
