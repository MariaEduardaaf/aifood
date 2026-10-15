import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { MenuManager } from '@/components/admin/menu-manager'

export default async function MenuPage() {
  const session = await auth()

  if (!session || session.user.role !== 'ADMIN') {
    redirect('/waiter')
  }

  return <MenuManager />
}
