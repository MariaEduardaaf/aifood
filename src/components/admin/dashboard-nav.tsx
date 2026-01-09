"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  TableProperties,
  Users,
  BarChart3,
  LogOut,
  Utensils,
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

interface NotificationCounts {
  feedbacks: number;
}

export function DashboardNav({ user }: DashboardNavProps) {
  const pathname = usePathname();
  const t = useTranslations("admin");
  const tAuth = useTranslations("auth");
  const [counts, setCounts] = useState<NotificationCounts>({ feedbacks: 0 });

  const isAdmin = user.role === "ADMIN" || user.role === "MANAGER";

  // Fetch notification counts
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        // Fetch recent feedbacks (last 24h as "new")
        const feedbacksRes = await fetch("/api/admin/feedbacks");
        if (feedbacksRes.ok) {
          const data = await feedbacksRes.json();
          // Count feedbacks from last 24 hours
          const now = new Date();
          const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          const newFeedbacks =
            data.feedbacks?.filter(
              (f: any) => new Date(f.created_at) > oneDayAgo,
            ).length || 0;
          setCounts((prev) => ({ ...prev, feedbacks: newFeedbacks }));
        }
      } catch (err) {
        console.error("Error fetching notification counts:", err);
      }
    };

    if (isAdmin) {
      fetchCounts();
      const interval = setInterval(fetchCounts, 30000); // Every 30 seconds
      return () => clearInterval(interval);
    }
  }, [isAdmin]);

  const navItems = [
    {
      href: "/admin/mesas",
      label: t("tables"),
      icon: TableProperties,
      show: isAdmin,
      badge: 0,
    },
    {
      href: "/admin/usuarios",
      label: t("users"),
      icon: Users,
      show: isAdmin,
      badge: 0,
    },
    {
      href: "/admin/metricas",
      label: t("metricsPage"),
      icon: BarChart3,
      show: isAdmin,
      badge: 0,
    },
    {
      href: "/admin/feedbacks",
      label: "Feedbacks",
      icon: MessageSquare,
      show: isAdmin,
      badge: counts.feedbacks,
    },
    {
      href: "/admin/cardapio",
      label: t("menu"),
      icon: ChefHat,
      show: isAdmin,
      badge: 0,
    },
    {
      href: "/admin/configuracoes",
      label: t("settings"),
      icon: Settings,
      show: isAdmin,
      badge: 0,
    },
  ];

  return (
    <header className="bg-primary sticky top-0 z-50 shadow-lg">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="flex items-center justify-between h-14 sm:h-16">
          <div className="flex items-center gap-4 sm:gap-8">
            {/* Logo */}
            <Link href="/garcom" className="flex items-center gap-2 group">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-all">
                <Utensils className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-lg sm:text-xl text-white hidden xs:inline">
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
                        "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 relative",
                        isActive
                          ? "bg-white/20 text-white"
                          : "text-white/70 hover:bg-white/10 hover:text-white",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="hidden xl:inline">{item.label}</span>
                      {item.badge > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full">
                          {item.badge > 99 ? "99+" : item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
            </nav>
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-2 sm:gap-3">
            <SoundToggleCompact className="text-white/70 hover:text-white hover:bg-white/10" />
            <ThemeToggleCompact className="text-white/70 hover:text-white hover:bg-white/10" />
            <div className="flex items-center gap-2 sm:gap-3 px-2 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-white/10">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                <span className="text-sm font-semibold text-white">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-white truncate max-w-[120px]">
                  {user.name}
                </p>
                <p className="text-xs text-white/70">
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
              className="flex items-center justify-center gap-2 p-2 sm:px-4 sm:py-2 rounded-xl text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-all duration-200 min-w-[44px] min-h-[44px]"
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
                    "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 whitespace-nowrap min-h-[40px] relative",
                    isActive
                      ? "bg-white/20 text-white"
                      : "text-white/70 hover:bg-white/10 hover:text-white",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                  {item.badge > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full">
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
        </nav>
      </div>
    </header>
  );
}
