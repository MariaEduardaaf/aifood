import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SuperAdminNav } from "@/components/superadmin/superadmin-nav";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "SUPER_ADMIN") {
    redirect("/garcom");
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/3 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-primary/2 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10">
        <SuperAdminNav user={session.user} />
        <main className="container mx-auto px-4 py-8">{children}</main>
      </div>
    </div>
  );
}
