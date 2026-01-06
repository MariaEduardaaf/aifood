import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-gradient-to-b from-blue-50 to-white">
      <div className="text-center max-w-2xl">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          aiFood
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Plataforma de Atendimento Inteligente para Restaurantes
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/login"
            className="px-6 py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors"
          >
            Entrar como Staff
          </Link>
        </div>

        <div className="mt-12 text-sm text-gray-500">
          <p>Para clientes: escaneie o QR Code na sua mesa</p>
        </div>
      </div>
    </main>
  )
}
