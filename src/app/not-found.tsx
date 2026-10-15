import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { Button } from '@/components/ui'

export default async function NotFound() {
  const t = await getTranslations('notFound')
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white p-8">
      <div className="text-center max-w-md">
        <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          {t('title')}
        </h2>
        <p className="text-gray-600 mb-8">
          {t('message')}
        </p>
        <Link href="/">
          <Button size="lg">
            {t('backHome')}
          </Button>
        </Link>
      </div>
    </div>
  )
}
