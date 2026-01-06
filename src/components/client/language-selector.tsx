'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui'

const locales = [
  { code: 'pt', label: 'PT' },
  { code: 'es', label: 'ES' },
  { code: 'en', label: 'EN' },
]

export function LanguageSelector() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const changeLocale = (locale: string) => {
    // Set locale cookie
    document.cookie = `locale=${locale};path=/;max-age=31536000`

    // Refresh the page to apply the new locale
    startTransition(() => {
      router.refresh()
    })
  }

  return (
    <div className="flex gap-1">
      {locales.map((locale) => (
        <Button
          key={locale.code}
          variant="ghost"
          size="sm"
          onClick={() => changeLocale(locale.code)}
          disabled={isPending}
          className="px-2 text-xs font-medium"
        >
          {locale.label}
        </Button>
      ))}
    </div>
  )
}
