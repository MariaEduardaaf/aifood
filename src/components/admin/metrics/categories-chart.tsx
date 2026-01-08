'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts'

interface CategoryData {
  id: string
  nome: string
  pedidos: number
  itens: number
  receita: number
  percentual: number
}

interface CategoriesChartProps {
  periodo?: string
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

export function CategoriesChart({ periodo = 'hoje' }: CategoriesChartProps) {
  const t = useTranslations('admin.metrics')
  const [data, setData] = useState<CategoryData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        const response = await fetch(`/api/admin/metricas/categorias?periodo=${periodo}`)
        if (!response.ok) throw new Error('Erro ao carregar dados')
        const result = await response.json()
        setData(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [periodo])

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-4 animate-pulse" />
        <div className="h-80 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-600 dark:text-red-400">
        {error}
      </div>
    )
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0
    }).format(value)
  }

  const totalReceita = data.reduce((sum, cat) => sum + cat.receita, 0)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        {t('revenueByCategory')}
      </h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Pizza */}
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data as unknown as Record<string, unknown>[]}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="receita"
                nameKey="nome"
                label={false}
                labelLine={false}
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--tooltip-bg, #fff)',
                  borderColor: 'var(--tooltip-border, #e5e7eb)',
                  borderRadius: '8px'
                }}
                formatter={(value) => [formatCurrency(value as number), t('revenue')]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Lista de categorias */}
        <div className="space-y-3">
          <div className="text-center mb-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('totalRevenue')}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(totalReceita)}</p>
          </div>

          {data.map((category, index) => (
            <div key={category.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div
                className="w-4 h-4 rounded-full flex-shrink-0"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {category.nome}
                  </p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white ml-2">
                    {category.percentual}%
                  </p>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {category.itens} {t('items')} • {category.pedidos} {t('orders')}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatCurrency(category.receita)}
                  </p>
                </div>
                {/* Barra de progresso */}
                <div className="mt-2 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${category.percentual}%`,
                      backgroundColor: COLORS[index % COLORS.length]
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
