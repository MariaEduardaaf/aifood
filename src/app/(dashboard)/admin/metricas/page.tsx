import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { MetricsDashboard } from '@/components/admin/metrics-dashboard'

export default async function MetricasPage() {
  const session = await auth()

  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
    redirect('/garcom')
  }

  return <MetricsDashboard />
}
