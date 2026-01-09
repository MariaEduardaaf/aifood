"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  TableProperties,
  Users,
  BarChart3,
  Bell,
  LogOut,
  Utensils,
  ChevronRight,
  Settings,
  ChefHat,
  MessageSquare,
} from "lucide-react";
import { ThemeToggleCompact } from "@/components/ui/theme-toggle";
import { SoundToggleCompact } from "@/components/ui/sound-settings";
import type { Role } from "@prisma/client";

interface DashboardNavProps {
  user: {
    name: string;
    role: Role;
  };
}

export function DashboardNav({ user }: DashboardNavProps) {
  const pathname = usePathname();
  const t = useTranslations("admin");
  const tAuth = useTranslations("auth");

  const isAdmin = user.role === "ADMIN" || user.role === "MANAGER";

  const navItems = [
    {
      href: "/admin/mesas",
      label: t("tables"),
      icon: TableProperties,
      show: isAdmin,
    },
    {
      href: "/admin/usuarios",
      label: t("users"),
      icon: Users,
      show: isAdmin,
    },
    {
      href: "/admin/metricas",
      label: t("metrics"),
      icon: BarChart3,
      show: isAdmin,
    },
    {
      href: "/admin/feedbacks",
      label: "Feedbacks",
      icon: MessageSquare,
      show: isAdmin,
    },
    {
      href: "/admin/cardapio",
      label: t("menu"),
      icon: ChefHat,
      show: isAdmin,
    },
    {
      href: "/admin/configuracoes",
      label: t("settings"),
      icon: Settings,
      show: isAdmin,
    },
  ];

  return (
    <header className="bg-card/50 backdrop-blur-xl border-b border-border/50 sticky top-0 z-50">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="flex items-center justify-between h-14 sm:h-16">
          <div className="flex items-center gap-4 sm:gap-8">
            {/* Logo */}
            <Link href="/garcom" className="flex items-center gap-2 group">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20 group-hover:shadow-primary/30 transition-all">
                <Utensils className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg sm:text-xl text-gold hidden xs:inline">
                aiFood
              </span>
            </Link>

            {/* Navigation - Desktop */}
            <nav className="hidden lg:flex items-center gap-1">
              {navItems
                .filter((item) => item.show)
                .map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/garcom" &&
                      item.href !== "/admin" &&
                      pathname.startsWith(item.href));

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200",
                        isActive
                          ? "bg-primary/10 text-primary border border-primary/20"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="hidden xl:inline">{item.label}</span>
                    </Link>
                  );
                })}
            </nav>
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-2 sm:gap-3">
            <SoundToggleCompact />
            <ThemeToggleCompact />
            <div className="flex items-center gap-2 sm:gap-3 px-2 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-secondary/50 border border-border/50">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                <span className="text-sm font-semibold text-primary">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-foreground truncate max-w-[120px]">
                  {user.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {user.role === "ADMIN"
                    ? "Admin"
                    : user.role === "MANAGER"
                      ? "Gerente"
                      : "Garçom"}
                </p>
              </div>
            </div>

            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex items-center justify-center gap-2 p-2 sm:px-4 sm:py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-all duration-200 min-w-[44px] min-h-[44px]"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">{tAuth("logout")}</span>
            </button>
          </div>
        </div>

        {/* Navigation - Mobile */}
        <nav className="lg:hidden flex items-center gap-1 pb-3 overflow-x-auto scrollbar-hide">
          {navItems
            .filter((item) => item.show)
            .map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== "/garcom" &&
                  item.href !== "/admin" &&
                  pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 whitespace-nowrap min-h-[40px]",
                    isActive
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
        </nav>
      </div>
    </header>
  );
}
