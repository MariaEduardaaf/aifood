"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Globe } from "lucide-react";

const locales = [
  { code: "pt", label: "PT", flag: "🇧🇷" },
  { code: "es", label: "ES", flag: "🇪🇸" },
  { code: "en", label: "EN", flag: "🇺🇸" },
];

export function LanguageSelector() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const changeLocale = (locale: string) => {
    // Set locale cookie
    document.cookie = `locale=${locale};path=/;max-age=31536000`;

    // Refresh the page to apply the new locale
    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <div className="flex items-center gap-1 p-1 rounded-xl bg-secondary/50 border border-border/50">
      {locales.map((locale) => (
        <button
          key={locale.code}
          onClick={() => changeLocale(locale.code)}
          disabled={isPending}
          className="
            px-3 py-1.5 rounded-lg text-xs font-semibold
            transition-all duration-200
            hover:bg-primary/20 hover:text-primary
            disabled:opacity-50 disabled:cursor-not-allowed
            text-muted-foreground
          "
        >
          <span className="mr-1">{locale.flag}</span>
          {locale.label}
        </button>
      ))}
    </div>
  );
}
