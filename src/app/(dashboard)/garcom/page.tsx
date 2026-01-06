import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { WaiterDashboard } from '@/components/waiter/waiter-dashboard'

export default async function GarcomPage() {
  const session = await auth()

  if (!session) {
    redirect('/login')
  }

  return <WaiterDashboard userId={session.user.id} />
}
