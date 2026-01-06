import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { TablesManager } from '@/components/admin/tables-manager'

export default async function MesasPage() {
  const session = await auth()

  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
    redirect('/garcom')
  }

  return <TablesManager />
}
