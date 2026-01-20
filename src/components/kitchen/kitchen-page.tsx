"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { ChefHat, LogOut, LayoutGrid, List } from "lucide-react";
import { signOut } from "next-auth/react";
import { KitchenPanel } from "./kitchen-panel";
import { KitchenKanban } from "./kitchen-kanban";
import { ThemeToggleCompact } from "@/components/ui/theme-toggle";
import { SoundToggleCompact } from "@/components/ui/sound-settings";
import { cn } from "@/lib/utils";

interface KitchenPageProps {
  userId: string;
  userName: string;
}

type ViewMode = "kanban" | "list";

export function KitchenPage({ userId, userName }: KitchenPageProps) {
  const t = useTranslations("kitchen");
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-primary shadow-lg">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo + Title */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Image
                  src="/logo.svg"
                  alt="aiFood Logo"
                  width={36}
                  height={36}
                  className="object-contain"
                  priority
                />
                <span className="font-bold text-xl text-white hidden sm:inline">
                  aiFood
                </span>
              </div>
              <div className="hidden sm:block h-8 w-px bg-white/20" />
              <div className="flex items-center gap-2">
                <ChefHat className="h-5 w-5 text-white/80" />
                <span className="font-semibold text-white">{t("title")}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
              {/* View Mode Toggle */}
              <div className="flex items-center gap-1 p-1 rounded-lg bg-white/10 border border-white/20">
                <button
                  onClick={() => setViewMode("kanban")}
                  className={cn(
                    "p-2 rounded-md transition-all duration-200",
                    viewMode === "kanban"
                      ? "bg-white text-primary shadow-sm"
                      : "text-white/70 hover:text-white hover:bg-white/10",
                  )}
                  title="Kanban"
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={cn(
                    "p-2 rounded-md transition-all duration-200",
                    viewMode === "list"
                      ? "bg-white text-primary shadow-sm"
                      : "text-white/70 hover:text-white hover:bg-white/10",
                  )}
                  title="Lista"
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
              <SoundToggleCompact className="text-white/70 hover:text-white hover:bg-white/10" />
              <ThemeToggleCompact className="text-white/70 hover:text-white hover:bg-white/10" />

              {/* User info */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10">
                <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                  <span className="text-sm font-semibold text-white">
                    {userName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-sm font-medium text-white">
                  {userName}
                </span>
              </div>

              <button
                onClick={handleLogout}
                className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                title="Sair"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="container mx-auto p-4 sm:p-6">
        {viewMode === "kanban" ? <KitchenKanban /> : <KitchenPanel />}
      </div>
    </div>
  );
}
