import { unstable_cache } from 'next/cache'
import { prisma } from '@/lib/db'
import { isLocale, type Locale } from './locales'

// Read-only, cached per token: at most one query per table every 30s, so a
// settings change reaches guests within that window.
const getGuestLocaleSettings = unstable_cache(
  async (token: string) => {
    const table = await prisma.table.findUnique({
      where: { qr_token: token },
      select: {
        active: true,
        restaurant: {
          select: {
            active: true,
            settings: { select: { enabled_locales: true, default_locale: true } },
          },
        },
      },
    })
    if (!table || !table.active || !table.restaurant.active) return null
    return {
      enabled_locales: table.restaurant.settings?.enabled_locales ?? ['es', 'en'],
      default_locale: table.restaurant.settings?.default_locale ?? 'es',
    }
  },
  ['guest-locale'],
  { revalidate: 30 },
)

// Guest UI language, limited to what the restaurant offers: the `locale`
// cookie if enabled, else the best Accept-Language match, else the default.
// Nothing is written back; the language selector sets the cookie.
export async function resolveGuestLocale({
  token,
  cookieLocale,
  acceptLanguage,
}: {
  token: string
  cookieLocale?: string
  acceptLanguage?: string | null
}): Promise<{ locale: Locale; enabledLocales: Locale[]; defaultLocale: Locale } | null> {
  if (!token || token.length > 100) return null
  const settings = await getGuestLocaleSettings(token)
  if (!settings) return null

  const enabledLocales = settings.enabled_locales.filter(isLocale)
  const defaultLocale = isLocale(settings.default_locale) ? settings.default_locale : 'es'
  if (cookieLocale && isLocale(cookieLocale) && enabledLocales.includes(cookieLocale)) {
    return { locale: cookieLocale, enabledLocales, defaultLocale }
  }
  const accepted = (acceptLanguage ?? '')
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().split(';')
      const q = params.find((p) => p.trim().startsWith('q='))
      return { lang: tag.slice(0, 2).toLowerCase(), q: q ? Number(q.trim().slice(2)) || 0 : 1 }
    })
    .filter((a) => a.q > 0)
    .sort((a, b) => b.q - a.q)
  const match = accepted.find((a) => isLocale(a.lang) && enabledLocales.includes(a.lang))
  return { locale: (match?.lang as Locale | undefined) ?? defaultLocale, enabledLocales, defaultLocale }
}
