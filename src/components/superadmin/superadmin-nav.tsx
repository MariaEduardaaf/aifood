"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  Building2,
  Users,
  TableProperties,
  ChefHat,
  BarChart3,
  Activity,
  MessageSquare,
  LogOut,
} from "lucide-react";
import { ThemeToggleCompact } from "@/components/ui/theme-toggle";
import { SoundToggleCompact } from "@/components/ui/sound-settings";
import { Select } from "@/components/ui/select";
import type { Role } from "@prisma/client";

interface SuperAdminNavProps {
  user: {
    name: string;
    role: Role;
  };
}

interface Restaurant {
  id: string;
  name: string;
  active: boolean;
}

export function SuperAdminNav({ user }: SuperAdminNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loadingRestaurants, setLoadingRestaurants] = useState(true);

  const restaurantId = searchParams.get("restaurantId") || "";

  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        const res = await fetch("/api/restaurantes");
        if (res.ok) {
          const data = await res.json();
          setRestaurants(data);
        }
      } catch (err) {
        console.error("Error fetching restaurants:", err);
      } finally {
        setLoadingRestaurants(false);
      }
    };

    fetchRestaurants();
  }, []);

  const navItems = useMemo(
    () => [
      {
        href: "/superadmin/restaurantes",
        label: "Restaurantes",
        icon: Building2,
      },
      {
        href: "/superadmin/usuarios",
        label: "Usuarios",
        icon: Users,
      },
      {
        href: "/superadmin/mesas",
        label: "Mesas",
        icon: TableProperties,
      },
      {
        href: "/superadmin/cardapio",
        label: "Cardapio",
        icon: ChefHat,
      },
      {
        href: "/superadmin/operacao",
        label: "Operacao",
        icon: Activity,
      },
      {
        href: "/superadmin/metricas",
        label: "Metricas",
        icon: BarChart3,
      },
      {
        href: "/superadmin/feedbacks",
        label: "Feedbacks",
        icon: MessageSquare,
      },
    ],
    [],
  );

  const buildHref = (href: string) => {
    if (!restaurantId) return href;
    const params = new URLSearchParams();
    params.set("restaurantId", restaurantId);
    return `${href}?${params.toString()}`;
  };

  const handleRestaurantChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("restaurantId", value);
    } else {
      params.delete("restaurantId");
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  return (
    <header className="bg-primary sticky top-0 z-50 shadow-lg">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="flex items-center justify-between h-14 sm:h-16">
          <div className="flex items-center gap-4 sm:gap-6">
            <Link href="/superadmin" className="flex items-center gap-2 group">
              <Image
                src="/darklogo.webp"
                alt="aiFood Logo"
                width={36}
                height={36}
                className="object-contain"
                priority
              />
              <div className="hidden xs:block">
                <p className="font-bold text-lg sm:text-xl text-white">
                  aiFood
                </p>
                <p className="text-[10px] text-white/70 uppercase tracking-wide">
                  Super Admin
                </p>
              </div>
            </Link>

            <div className="hidden md:flex items-center gap-2 min-w-[240px]">
              <Select
                value={restaurantId}
                onChange={(event) => handleRestaurantChange(event.target.value)}
                className="bg-white/10 text-white border-white/20"
                disabled={loadingRestaurants || restaurants.length === 0}
              >
                <option value="">
                  {loadingRestaurants
                    ? "Carregando..."
                    : restaurants.length === 0
                      ? "Sem restaurantes"
                      : "Selecionar restaurante"}
                </option>
                {restaurants.map((restaurant) => (
                  <option key={restaurant.id} value={restaurant.id}>
                    {restaurant.name}
                    {restaurant.active ? "" : " (Inativo)"}
                  </option>
                ))}
              </Select>
            </div>

            <nav className="hidden lg:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/superadmin" &&
                    pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={buildHref(item.href)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-white/20 text-white"
                        : "text-white/70 hover:bg-white/10 hover:text-white",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden xl:inline">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

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
                <p className="text-xs text-white/70">Super Admin</p>
              </div>
            </div>

            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex items-center justify-center gap-2 p-2 sm:px-4 sm:py-2 rounded-xl text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-all duration-200 min-w-[44px] min-h-[44px]"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>

        <nav className="lg:hidden flex items-center gap-1 pb-3 overflow-x-auto scrollbar-hide">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== "/superadmin" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={buildHref(item.href)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 whitespace-nowrap min-h-[40px]",
                  isActive
                    ? "bg-white/20 text-white"
                    : "text-white/70 hover:bg-white/10 hover:text-white",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="md:hidden pb-3">
          <Select
            value={restaurantId}
            onChange={(event) => handleRestaurantChange(event.target.value)}
            className="bg-white/10 text-white border-white/20"
            disabled={loadingRestaurants || restaurants.length === 0}
          >
            <option value="">
              {loadingRestaurants
                ? "Carregando..."
                : restaurants.length === 0
                  ? "Sem restaurantes"
                  : "Selecionar restaurante"}
            </option>
            {restaurants.map((restaurant) => (
              <option key={restaurant.id} value={restaurant.id}>
                {restaurant.name}
                {restaurant.active ? "" : " (Inativo)"}
              </option>
            ))}
          </Select>
        </div>
      </div>
    </header>
  );
}
