import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import {
  TableProperties,
  Users,
  BarChart3,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export default async function AdminPage() {
  const session = await auth();
  const t = await getTranslations("admin");

  if (
    !session ||
    (session.user.role !== "ADMIN" && session.user.role !== "MANAGER")
  ) {
    redirect("/garcom");
  }

  const cards = [
    {
      href: "/admin/mesas",
      title: t("tables"),
      description: "Gerenciar mesas e QR Codes",
      icon: TableProperties,
      gradient: "from-blue-500/20 to-cyan-500/10",
      iconColor: "text-blue-400",
      borderColor: "border-blue-500/20",
    },
    {
      href: "/admin/usuarios",
      title: t("users"),
      description: "Gerenciar usuários do sistema",
      icon: Users,
      gradient: "from-purple-500/20 to-pink-500/10",
      iconColor: "text-purple-400",
      borderColor: "border-purple-500/20",
    },
    {
      href: "/admin/metricas",
      title: t("metrics"),
      description: "Visualizar métricas de atendimento",
      icon: BarChart3,
      gradient: "from-green-500/20 to-emerald-500/10",
      iconColor: "text-green-400",
      borderColor: "border-green-500/20",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
          <Sparkles className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gold">{t("dashboard")}</h1>
          <p className="text-muted-foreground mt-1">Gerencie seu restaurante</p>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.href} href={card.href} className="group">
              <div
                className={`card-premium rounded-2xl p-6 h-full transition-all duration-300 group-hover:translate-y-[-4px] border ${card.borderColor}`}
              >
                <div
                  className={`w-14 h-14 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110`}
                >
                  <Icon className={`h-7 w-7 ${card.iconColor}`} />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">
                  {card.title}
                </h3>
                <p className="text-muted-foreground text-sm mb-4">
                  {card.description}
                </p>
                <div className="flex items-center gap-2 text-primary text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <span>Acessar</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
