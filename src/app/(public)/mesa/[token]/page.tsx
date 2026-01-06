import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import { ClientTablePage } from '@/components/client/client-table-page'

interface Props {
  params: { token: string }
}

export default async function MesaPage({ params }: Props) {
  const table = await prisma.table.findUnique({
    where: { qr_token: params.token },
    select: {
      id: true,
      label: true,
      active: true,
    }
  })

  if (!table || !table.active) {
    notFound()
  }

  return <ClientTablePage tableId={table.id} tableLabel={table.label} />
}
