import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import { ClientTablePage } from '@/components/client/client-table-page'

interface Props {
  params: { token: string }
}

export default async function TablePage({ params }: Props) {
  const table = await prisma.table.findUnique({
    where: { qr_token: params.token },
    select: {
      label: true,
      active: true,
      restaurant: {
        select: {
          name: true,
          active: true,
          settings: {
            select: { enabled_locales: true, default_locale: true, ordering_enabled: true },
          },
        },
      },
    },
  })

  if (!table || !table.active || !table.restaurant.active) {
    notFound()
  }

  // First paint uses these; GET /api/menu (fetched on the client) is the live source
  const settings = table.restaurant.settings
  return (
    <ClientTablePage
      token={params.token}
      tableLabel={table.label}
      restaurantName={table.restaurant.name}
      initialSettings={{
        enabled_locales: settings?.enabled_locales ?? ['es', 'en'],
        default_locale: settings?.default_locale ?? 'es',
        ordering_enabled: settings?.ordering_enabled ?? true,
      }}
    />
  )
}
