"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChefHat, LayoutGrid, List } from "lucide-react";
import { KitchenPanel } from "./kitchen-panel";
import { KitchenKanban } from "./kitchen-kanban";
import { cn } from "@/lib/utils";
import { useWakeLock } from "@/components/providers/staff-alerts";

interface KitchenPageProps {
  userId: string;
  userName: string;
}

type ViewMode = "kanban" | "list";

export function KitchenPage(_props: KitchenPageProps) {
  const t = useTranslations("kitchen");
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  useWakeLock();

  return (
    <div className="min-h-screen">
      {/* Title + view toggle (sound, theme and logout live in the nav header) */}
      <div className="container mx-auto px-4 sm:px-6 pt-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ChefHat aria-hidden className="h-5 w-5 text-price" />
          <h1 className="font-semibold text-lg">{t("title")}</h1>
        </div>
        <div className="flex items-center gap-1 p-1 rounded-lg bg-secondary/50 border border-border/50">
          <button
            onClick={() => setViewMode("kanban")}
            aria-label={t("boardView")}
            aria-pressed={viewMode === "kanban"}
            className={cn(
              "p-2.5 rounded-md transition-all duration-200 min-w-[44px] min-h-[44px] flex items-center justify-center",
              viewMode === "kanban"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary",
            )}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            aria-label={t("listView")}
            aria-pressed={viewMode === "list"}
            className={cn(
              "p-2.5 rounded-md transition-all duration-200 min-w-[44px] min-h-[44px] flex items-center justify-center",
              viewMode === "list"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary",
            )}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto p-4 sm:p-6">
        {viewMode === "kanban" ? <KitchenKanban /> : <KitchenPanel />}
      </div>
    </div>
  );
}
