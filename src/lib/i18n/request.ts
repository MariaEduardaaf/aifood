import { getRequestConfig } from 'next-intl/server'
import { cookies, headers } from 'next/headers'
import { SUPPORTED_LOCALES, isLocale, type Locale } from './locales'
import { resolveGuestLocale } from './guest-locale'

export const locales = SUPPORTED_LOCALES
export type { Locale }
export const defaultLocale: Locale = 'en'

async function loadMessages(locale: Locale) {
  try {
    return (await import(`../../../messages/${locale}.json`)).default
  } catch {
    // A locale whose messages file does not exist yet falls back to English
    return (await import('../../../messages/en.json')).default
  }
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  const headersList = await headers()

  // Guest table page: the restaurant's enabled locales limit the choice
  const tableToken = headersList.get('x-pathname')?.match(/^\/table\/([^/]+)/)?.[1]
  if (tableToken) {
    const guest = await resolveGuestLocale({
      token: tableToken,
      cookieLocale: cookieStore.get('locale')?.value,
      acceptLanguage: headersList.get('accept-language'),
    })
    if (guest) return { locale: guest.locale, messages: await loadMessages(guest.locale) }
  }

  // Try to get locale from cookie first
  let locale = cookieStore.get('locale')?.value

  // If no cookie, try Accept-Language header
  if (!locale) {
    const acceptLanguage = headersList.get('accept-language')
    if (acceptLanguage) {
      locale = acceptLanguage.split(',')[0].split('-')[0]
    }
  }

  // Fall back to the default locale (English)
  const resolved: Locale = locale && isLocale(locale) ? locale : defaultLocale

  return {
    locale: resolved,
    messages: await loadMessages(resolved)
  }
})
