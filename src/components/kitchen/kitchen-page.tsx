"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border/50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <ChefHat className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-lg">{t("title")}</h1>
              <p className="text-sm text-muted-foreground">{userName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 p-1 rounded-lg bg-secondary/50 border border-border/50">
              <button
                onClick={() => setViewMode("kanban")}
                className={cn(
                  "p-2 rounded-md transition-all duration-200",
                  viewMode === "kanban"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
                title="Kanban (Drag & Drop)"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={cn(
                  "p-2 rounded-md transition-all duration-200",
                  viewMode === "list"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
                title="Lista"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
            <SoundToggleCompact />
            <ThemeToggleCompact />
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl hover:bg-secondary/50 transition-colors text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6">
        {viewMode === "kanban" ? <KitchenKanban /> : <KitchenPanel />}
      </div>
    </div>
  );
}
