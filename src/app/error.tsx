'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-red-50 to-white p-8">
      <div className="text-center max-w-md">
        <h1 className="text-4xl font-bold text-red-600 mb-4">Ops!</h1>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Algo deu errado
        </h2>
        <p className="text-gray-600 mb-8">
          Ocorreu um erro inesperado. Por favor, tente novamente.
        </p>
        <Button onClick={reset} size="lg">
          Tentar novamente
        </Button>
      </div>
    </div>
  )
}
