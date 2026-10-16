import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { MetricsDashboard } from '@/components/admin/metrics-dashboard'

export default async function MetricsPage() {
  const session = await auth()

  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
    redirect('/waiter')
  }

  return <MetricsDashboard />
}
