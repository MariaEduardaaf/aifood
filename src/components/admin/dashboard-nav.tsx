'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  TableProperties,
  Users,
  BarChart3,
  Bell,
  LogOut
} from 'lucide-react'
import type { Role } from '@prisma/client'

interface DashboardNavProps {
  user: {
    name: string
    role: Role
  }
}

export function DashboardNav({ user }: DashboardNavProps) {
  const pathname = usePathname()
  const t = useTranslations('admin')
  const tAuth = useTranslations('auth')

  const isAdmin = user.role === 'ADMIN' || user.role === 'MANAGER'

  const navItems = [
    {
      href: '/garcom',
      label: 'Chamados',
      icon: Bell,
      show: true,
    },
    {
      href: '/admin',
      label: t('dashboard'),
      icon: LayoutDashboard,
      show: isAdmin,
    },
    {
      href: '/admin/mesas',
      label: t('tables'),
      icon: TableProperties,
      show: isAdmin,
    },
    {
      href: '/admin/usuarios',
      label: t('users'),
      icon: Users,
      show: isAdmin,
    },
    {
      href: '/admin/metricas',
      label: t('metrics'),
      icon: BarChart3,
      show: isAdmin,
    },
  ]

  return (
    <header className="bg-white border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/garcom" className="font-bold text-xl text-primary">
              aiFood
            </Link>
            <nav className="hidden md:flex items-center gap-1">
              {navItems
                .filter((item) => item.show)
                .map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href ||
                    (item.href !== '/garcom' && item.href !== '/admin' && pathname.startsWith(item.href))

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-gray-600 hover:bg-gray-100'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  )
                })}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user.name}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut({ callbackUrl: '/login' })}
            >
              <LogOut className="h-4 w-4 mr-2" />
              {tAuth('logout')}
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
