"use client";

import { Sun, Moon, Monitor } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "@/components/providers/theme-provider";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const t = useTranslations("settings.theme");
  const { theme, setTheme } = useTheme();

  const options = [
    { value: "light" as const, icon: Sun, label: t("light") },
    { value: "dark" as const, icon: Moon, label: t("dark") },
    { value: "system" as const, icon: Monitor, label: t("system") },
  ];

  return (
    <div className="flex items-center gap-1 p-1 rounded-lg bg-secondary/50 border border-border/50">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => setTheme(opt.value)}
          className={cn(
            "p-2 rounded-md transition-all duration-200",
            theme === opt.value
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary",
          )}
          title={opt.label}
        >
          <opt.icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  );
}

export function ThemeToggleCompact({ className }: { className?: string }) {
  const t = useTranslations("settings.theme");
  const { resolvedTheme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        "p-2 rounded-lg transition-all duration-200",
        className ||
          "bg-secondary/50 border border-border/50 text-muted-foreground hover:text-foreground hover:bg-secondary",
      )}
      title={resolvedTheme === "dark" ? t("lightMode") : t("darkMode")}
    >
      {resolvedTheme === "dark" ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </button>
  );
}
