import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { UsersManager } from '@/components/admin/users-manager'

export default async function UsersPage() {
  const session = await auth()

  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
    redirect('/waiter')
  }

  return <UsersManager currentUserId={session.user.id} />
}
