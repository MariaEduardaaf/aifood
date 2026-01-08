'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { BarChart3, TrendingUp, RefreshCw } from 'lucide-react'
import {
  MetricsOverview,
  OrdersByHourChart,
  OrdersByDayChart,
  TopProductsChart,
  CategoriesChart,
  RealTimePanel,
  PeriodSelector
} from '@/components/admin/metrics'

export default function MetricsPage() {
  const t = useTranslations('admin.metrics')
  const [periodo, setPeriodo] = useState('hoje')
  const [refreshKey, setRefreshKey] = useState(0)

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <BarChart3 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  {t('title')}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('subtitle')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <PeriodSelector value={periodo} onChange={setPeriodo} />
              <button
                onClick={handleRefresh}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title={t('refresh')}
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8" key={refreshKey}>
          {/* Overview KPIs */}
          <section>
            <MetricsOverview periodo={periodo} />
          </section>

          {/* Charts Grid */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <OrdersByHourChart periodo={periodo} />
            <OrdersByDayChart periodo={periodo} />
          </section>

          {/* Products and Categories */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TopProductsChart periodo={periodo} />
            <CategoriesChart periodo={periodo} />
          </section>

          {/* Real-time Panel */}
          <section>
            <RealTimePanel refreshInterval={30000} />
          </section>
        </div>
      </main>
    </div>
  )
}
