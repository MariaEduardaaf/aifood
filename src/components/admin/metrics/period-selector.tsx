'use client'

import { useTranslations } from 'next-intl'

interface PeriodSelectorProps {
  value: string
  onChange: (period: string) => void
}

export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  const t = useTranslations('admin.metrics')

  const periods = [
    { value: 'hoje', label: t('today') },
    { value: 'ontem', label: t('yesterday') },
    { value: 'semana', label: t('thisWeek') },
    { value: 'mes', label: t('thisMonth') },
    { value: '30dias', label: t('last30Days') },
  ]

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-500 dark:text-gray-400">{t('period')}:</span>
      <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
        {periods.map((period) => (
          <button
            key={period.value}
            onClick={() => onChange(period.value)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              value === period.value
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {period.label}
          </button>
        ))}
      </div>
    </div>
  )
}
