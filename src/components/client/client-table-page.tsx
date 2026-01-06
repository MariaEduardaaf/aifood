'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Button, Card, CardContent } from '@/components/ui'
import { Bell, Receipt, Loader2, Check } from 'lucide-react'
import { LanguageSelector } from './language-selector'

interface OpenCall {
  id: string
  type: 'CALL_WAITER' | 'REQUEST_BILL'
  created_at: string
}

interface ClientTablePageProps {
  tableId: string
  tableLabel: string
}

export function ClientTablePage({ tableId, tableLabel }: ClientTablePageProps) {
  const t = useTranslations('client')

  const [openCalls, setOpenCalls] = useState<OpenCall[]>([])
  const [loading, setLoading] = useState<'waiter' | 'bill' | null>(null)
  const [cooldown, setCooldown] = useState<{ waiter: number; bill: number }>({ waiter: 0, bill: 0 })
  const [success, setSuccess] = useState<'waiter' | 'bill' | null>(null)

  // Check for existing open calls
  useEffect(() => {
    const checkOpenCalls = async () => {
      try {
        const res = await fetch(`/api/mesa/${tableId}`)
        if (res.ok) {
          const data = await res.json()
          setOpenCalls(data.openCalls || [])
        }
      } catch (err) {
        console.error('Error checking open calls:', err)
      }
    }
    checkOpenCalls()
  }, [tableId])

  // Cooldown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCooldown((prev) => ({
        waiter: Math.max(0, prev.waiter - 1),
        bill: Math.max(0, prev.bill - 1),
      }))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Clear success message after 3 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [success])

  const hasOpenCall = (type: 'CALL_WAITER' | 'REQUEST_BILL') => {
    return openCalls.some((call) => call.type === type)
  }

  const handleCall = async (type: 'CALL_WAITER' | 'REQUEST_BILL') => {
    const loadingKey = type === 'CALL_WAITER' ? 'waiter' : 'bill'
    setLoading(loadingKey)

    try {
      const res = await fetch('/api/chamado', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableId, type }),
      })

      const data = await res.json()

      if (res.status === 429) {
        // Rate limited
        setCooldown((prev) => ({
          ...prev,
          [loadingKey]: data.waitTime || 30,
        }))
      } else if (res.ok) {
        // Success
        setOpenCalls((prev) => [...prev, data])
        setSuccess(loadingKey)
      }
    } catch (err) {
      console.error('Error creating call:', err)
    } finally {
      setLoading(null)
    }
  }

  const waiterDisabled = loading === 'waiter' || cooldown.waiter > 0 || hasOpenCall('CALL_WAITER')
  const billDisabled = loading === 'bill' || cooldown.bill > 0 || hasOpenCall('REQUEST_BILL')

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col">
      {/* Header */}
      <header className="bg-white border-b py-4 px-6">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <h1 className="text-xl font-bold text-primary">aiFood</h1>
          <LanguageSelector />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 pb-8">
            {/* Table Label */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-full mb-4">
                <span className="text-3xl">🍽️</span>
              </div>
              <h2 className="text-2xl font-bold">{tableLabel}</h2>
            </div>

            {/* Action Buttons */}
            <div className="space-y-4">
              {/* Call Waiter Button */}
              <Button
                size="xl"
                className="w-full h-16 text-lg"
                onClick={() => handleCall('CALL_WAITER')}
                disabled={waiterDisabled}
                variant={hasOpenCall('CALL_WAITER') ? 'success' : 'default'}
              >
                {loading === 'waiter' ? (
                  <Loader2 className="h-6 w-6 animate-spin mr-3" />
                ) : hasOpenCall('CALL_WAITER') ? (
                  <Check className="h-6 w-6 mr-3" />
                ) : (
                  <Bell className="h-6 w-6 mr-3" />
                )}
                {hasOpenCall('CALL_WAITER')
                  ? t('waiterOnTheWay')
                  : cooldown.waiter > 0
                  ? `${t('callWaiter')} (${cooldown.waiter}s)`
                  : t('callWaiter')}
              </Button>

              {/* Request Bill Button */}
              <Button
                size="xl"
                className="w-full h-16 text-lg"
                variant={hasOpenCall('REQUEST_BILL') ? 'success' : 'secondary'}
                onClick={() => handleCall('REQUEST_BILL')}
                disabled={billDisabled}
              >
                {loading === 'bill' ? (
                  <Loader2 className="h-6 w-6 animate-spin mr-3" />
                ) : hasOpenCall('REQUEST_BILL') ? (
                  <Check className="h-6 w-6 mr-3" />
                ) : (
                  <Receipt className="h-6 w-6 mr-3" />
                )}
                {hasOpenCall('REQUEST_BILL')
                  ? t('billRequested')
                  : cooldown.bill > 0
                  ? `${t('requestBill')} (${cooldown.bill}s)`
                  : t('requestBill')}
              </Button>
            </div>

            {/* Success Messages */}
            {success && (
              <div className="mt-6 p-4 bg-green-50 text-green-700 rounded-lg text-center">
                <Check className="h-5 w-5 inline-block mr-2" />
                {t('callSent')}
              </div>
            )}

            {/* Waiting Message */}
            {(hasOpenCall('CALL_WAITER') || hasOpenCall('REQUEST_BILL')) && (
              <div className="mt-6 text-center text-muted-foreground">
                <p>{t('pleaseWait')}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-sm text-muted-foreground">
        <p>{t('thankYou')}</p>
      </footer>
    </div>
  )
}
