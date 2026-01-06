import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { DashboardNav } from '@/components/admin/dashboard-nav'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNav user={session.user} />
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
