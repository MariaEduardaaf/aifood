import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui'
import { TableProperties, Users, BarChart3 } from 'lucide-react'

export default async function AdminPage() {
  const session = await auth()
  const t = await getTranslations('admin')

  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
    redirect('/garcom')
  }

  const cards = [
    {
      href: '/admin/mesas',
      title: t('tables'),
      description: 'Gerenciar mesas e QR Codes',
      icon: TableProperties,
    },
    {
      href: '/admin/usuarios',
      title: t('users'),
      description: 'Gerenciar usuários do sistema',
      icon: Users,
    },
    {
      href: '/admin/metricas',
      title: t('metrics'),
      description: 'Visualizar métricas de atendimento',
      icon: BarChart3,
    },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('dashboard')}</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <Link key={card.href} href={card.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{card.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{card.description}</p>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
