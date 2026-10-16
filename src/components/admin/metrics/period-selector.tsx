'use client'

import { useTranslations } from 'next-intl'

interface PeriodSelectorProps {
  value: string
  onChange: (period: string) => void
}

export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  const t = useTranslations('admin.metrics')

  const periods = [
    { value: 'today', label: t('today') },
    { value: 'yesterday', label: t('yesterday') },
    { value: 'week', label: t('thisWeek') },
    { value: 'month', label: t('thisMonth') },
    { value: '30days', label: t('last30Days') },
  ]

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">{t('period')}:</span>
      <div className="flex bg-secondary rounded-lg p-1">
        {periods.map((period) => (
          <button
            key={period.value}
            onClick={() => onChange(period.value)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              value === period.value
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {period.label}
          </button>
        ))}
      </div>
    </div>
  )
}
