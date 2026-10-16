"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  Building,
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
  const t = useTranslations("superadmin");
  const tAdmin = useTranslations("admin");
  const tAuth = useTranslations("auth");
  const tCommon = useTranslations("common");
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loadingRestaurants, setLoadingRestaurants] = useState(true);

  const restaurantId = searchParams.get("restaurantId") || "";
  const STORAGE_KEY = "aifood-sa-restaurant";

  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        const res = await fetch("/api/restaurants");
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
        href: "/superadmin/restaurants",
        label: t("nav.restaurants"),
        icon: Building,
      },
      {
        href: "/superadmin/users",
        label: t("nav.users"),
        icon: Users,
      },
      {
        href: "/superadmin/tables",
        label: t("nav.tables"),
        icon: TableProperties,
      },
      {
        href: "/superadmin/menu",
        label: t("nav.menu"),
        icon: ChefHat,
      },
      {
        href: "/superadmin/operations",
        label: t("nav.operations"),
        icon: Activity,
      },
      {
        href: "/superadmin/metrics",
        label: t("nav.metrics"),
        icon: BarChart3,
      },
      {
        href: "/superadmin/feedbacks",
        label: t("nav.feedbacks"),
        icon: MessageSquare,
      },
    ],
    [t],
  );

  // Remember the selected restaurant across tabs; default to the only one
  useEffect(() => {
    if (loadingRestaurants || restaurants.length === 0) return;
    try {
      if (restaurantId) {
        localStorage.setItem(STORAGE_KEY, restaurantId);
        return;
      }
      const stored = localStorage.getItem(STORAGE_KEY);
      const pick =
        restaurants.find((r) => r.id === stored)?.id ||
        (restaurants.length === 1 ? restaurants[0].id : "");
      if (pick) {
        const params = new URLSearchParams(searchParams.toString());
        params.set("restaurantId", pick);
        router.replace(`${pathname}?${params.toString()}`);
      }
    } catch {
      // storage unavailable: selection just is not remembered
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingRestaurants, restaurants, restaurantId]);

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
    <header className="sticky top-0 z-50 border-b border-nav bg-nav text-nav-foreground shadow-lg">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="flex items-center justify-between h-14 sm:h-16">
          <div className="flex items-center gap-4 sm:gap-6">
            <Link href="/superadmin" aria-label="aiFood" className="flex items-center gap-2 group">
              <Image
                src="/logo-light.svg"
                alt="aiFood Logo"
                width={36}
                height={36}
                style={{ width: 36, height: 36 }}
                className="object-contain"
                priority
              />
              <div className="hidden xs:block">
                <p className="font-bold text-lg sm:text-xl text-nav-foreground">
                  aiFood
                </p>
                <p className="text-[10px] text-nav-muted-foreground uppercase tracking-wide">
                  {t("superAdmin")}
                </p>
              </div>
            </Link>

            <div className="hidden md:flex items-center gap-2 min-w-[200px]">
              <Select
                value={restaurantId}
                onChange={(event) => handleRestaurantChange(event.target.value)}
                className="bg-white/10 text-nav-foreground border-white/20"
                disabled={loadingRestaurants || restaurants.length === 0}
              >
                <option value="">
                  {loadingRestaurants
                    ? tCommon("loading")
                    : restaurants.length === 0
                      ? t("noRestaurants")
                      : t("selectRestaurant")}
                </option>
                {restaurants.map((restaurant) => (
                  <option key={restaurant.id} value={restaurant.id}>
                    {restaurant.name}
                    {restaurant.active ? "" : ` (${tAdmin("inactive")})`}
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
                    aria-label={item.label}
                    title={item.label}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-white/20 text-nav-foreground"
                        : "text-nav-muted-foreground hover:bg-white/10 hover:text-nav-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden 2xl:inline">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <SoundToggleCompact className="text-nav-muted-foreground hover:text-nav-foreground hover:bg-white/10" />
            <ThemeToggleCompact className="text-nav-muted-foreground hover:text-nav-foreground hover:bg-white/10" />
            <div className="flex items-center gap-2 sm:gap-3 px-2 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-white/10">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                <span className="text-sm font-semibold text-nav-foreground">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-nav-foreground truncate max-w-[120px]">
                  {user.name}
                </p>
                <p className="text-xs text-nav-muted-foreground">{t("superAdmin")}</p>
              </div>
            </div>

            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              aria-label={tAuth("logout")}
              className="flex items-center justify-center gap-2 p-2 sm:px-4 sm:py-2 rounded-xl text-sm font-medium text-nav-muted-foreground hover:text-nav-foreground hover:bg-white/10 transition-all duration-200 min-w-[44px] min-h-[44px]"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">{tAuth("logout")}</span>
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
                    ? "bg-white/20 text-nav-foreground"
                    : "text-nav-muted-foreground hover:bg-white/10 hover:text-nav-foreground",
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
            className="bg-white/10 text-nav-foreground border-white/20"
            disabled={loadingRestaurants || restaurants.length === 0}
          >
            <option value="">
              {loadingRestaurants
                ? tCommon("loading")
                : restaurants.length === 0
                  ? t("noRestaurants")
                  : t("selectRestaurant")}
            </option>
            {restaurants.map((restaurant) => (
              <option key={restaurant.id} value={restaurant.id}>
                {restaurant.name}
                {restaurant.active ? "" : ` (${tAdmin("inactive")})`}
              </option>
            ))}
          </Select>
        </div>
      </div>
    </header>
  );
}
