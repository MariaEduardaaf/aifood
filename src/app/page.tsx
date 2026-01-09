import Link from "next/link";
import Image from "next/image";
import {
  Bell,
  Receipt,
  BarChart3,
  QrCode,
  Sparkles,
  ArrowRight,
} from "lucide-react";

export default function Home() {
  const features = [
    {
      icon: Bell,
      title: "Chamar Garçom",
      description: "Cliente chama com um toque",
    },
    {
      icon: Receipt,
      title: "Pedir a Conta",
      description: "Solicite sem esperar",
    },
    {
      icon: BarChart3,
      title: "Métricas",
      description: "Acompanhe em tempo real",
    },
    {
      icon: QrCode,
      title: "QR Code",
      description: "Acesso instantâneo",
    },
  ];

  return (
    <main className="min-h-screen bg-animated">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-primary/3 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-0 w-[400px] h-[400px] bg-primary/2 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="py-6 px-6">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Image
                src="/darklogo.webp"
                alt="Visionary Logo"
                width={40}
                height={40}
                className="object-contain"
                priority
              />
              <span className="text-xl font-bold text-gold">Visionary</span>
            </div>
            <Link
              href="/login"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-secondary/50 border border-border/50 text-sm font-medium text-foreground hover:bg-secondary transition-all"
            >
              <span>Entrar</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </header>

        {/* Hero */}
        <section className="py-20 px-6">
          <div className="container mx-auto text-center max-w-4xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">
                Atendimento Inteligente
              </span>
            </div>

            {/* Title */}
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              <span className="text-foreground">Transforme o</span>
              <br />
              <span className="text-gold">Atendimento</span>
              <span className="text-foreground"> do seu</span>
              <br />
              <span className="text-foreground">Restaurante</span>
            </h1>

            {/* Subtitle */}
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Seus clientes chamam o garçom ou pedem a conta com um simples
              toque. Sem espera, sem frustrações.
            </p>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/login"
                className="btn-gold inline-flex items-center justify-center gap-2"
              >
                <span>Sou Garçom / Admin</span>
              </Link>
            </div>

            {/* Info for customers */}
            <div className="mt-8 inline-flex items-center gap-3 px-5 py-3 rounded-xl bg-secondary/30 border border-border/30">
              <QrCode className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                <span className="text-foreground font-medium">Cliente?</span>{" "}
                Escaneie o QR Code na sua mesa
              </span>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-20 px-6">
          <div className="container mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={feature.title}
                    className="card-premium rounded-2xl p-6 text-center group hover:scale-105 transition-transform duration-300"
                  >
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                      <Icon className="h-7 w-7 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-1">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-20 px-6">
          <div className="container mx-auto max-w-4xl">
            <div className="card-premium rounded-3xl p-10">
              <h2 className="text-2xl font-bold text-center text-gold mb-10">
                Como Funciona
              </h2>
              <div className="grid md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 text-xl font-bold text-primary">
                    1
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">
                    Cliente Escaneia
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    O cliente escaneia o QR Code na mesa
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 text-xl font-bold text-primary">
                    2
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">
                    Faz o Chamado
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Toca em "Chamar Garçom" ou "Pedir Conta"
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 text-xl font-bold text-primary">
                    3
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">
                    Garçom Atende
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    O garçom recebe em tempo real e atende
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-10 px-6 border-t border-border/50">
          <div className="container mx-auto text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Image
                src="/darklogo.webp"
                alt="Visionary Logo"
                width={32}
                height={32}
                className="object-contain"
              />
              <span className="font-bold text-gold">Visionary</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Plataforma de Atendimento Inteligente para Restaurantes
            </p>
            <p className="text-xs text-muted-foreground/60 mt-4">
              © 2026 Visionary. Todos os direitos reservados.
            </p>
          </div>
        </footer>
      </div>
    </main>
  );
}
