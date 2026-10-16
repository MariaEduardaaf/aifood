import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import { cookies, headers } from 'next/headers'
import { NextIntlClientProvider } from 'next-intl'
import { ClientTablePage } from '@/components/client/client-table-page'
import { isLocale } from '@/lib/i18n/locales'

interface Props {
  params: { token: string }
}

// Guest UI language, limited to what the restaurant offers: the `locale`
// cookie if enabled, else the best Accept-Language match, else the default.
// Nothing is written back; the language selector sets the cookie.
function guestLocale(enabled: string[], fallback: string): string {
  const cookie = cookies().get('locale')?.value
  if (cookie && enabled.includes(cookie)) return cookie
  const accepted = (headers().get('accept-language') ?? '')
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().split(';')
      const q = params.find((p) => p.trim().startsWith('q='))
      return { lang: tag.slice(0, 2).toLowerCase(), q: q ? Number(q.trim().slice(2)) || 0 : 1 }
    })
    .filter((a) => a.q > 0)
    .sort((a, b) => b.q - a.q)
  return accepted.find((a) => enabled.includes(a.lang))?.lang ?? fallback
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
  const enabled = (settings?.enabled_locales ?? ['es', 'en']).filter(isLocale)
  const defaultLocale = settings?.default_locale ?? 'es'
  const locale = guestLocale(enabled, isLocale(defaultLocale) ? defaultLocale : 'es')
  const messages = (await import(`../../../../../messages/${locale}.json`)).default

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <ClientTablePage
        token={params.token}
        tableLabel={table.label}
        restaurantName={table.restaurant.name}
        initialSettings={{
          enabled_locales: enabled,
          default_locale: defaultLocale,
          ordering_enabled: settings?.ordering_enabled ?? true,
        }}
      />
    </NextIntlClientProvider>
  )
}
