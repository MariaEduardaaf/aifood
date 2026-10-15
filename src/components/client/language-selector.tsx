"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Globe } from "lucide-react";

const locales = [
  { code: "pt", label: "PT", flag: "🇧🇷" },
  { code: "es", label: "ES", flag: "🇪🇸" },
  { code: "en", label: "EN", flag: "🇺🇸" },
];

// Compact native <select> so it never crowds the header (360px safe)
export function LanguageSelector() {
  const router = useRouter();
  const current = useLocale();
  const t = useTranslations("settings.language");
  const [isPending, startTransition] = useTransition();

  const changeLocale = (locale: string) => {
    document.cookie = `locale=${locale};path=/;max-age=31536000`;
    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <label className="relative flex items-center rounded-xl bg-secondary/50 border border-border/50 min-h-[44px]">
      <Globe className="h-4 w-4 ml-3 text-muted-foreground pointer-events-none" />
      <select
        aria-label={t("title")}
        value={current}
        onChange={(e) => changeLocale(e.target.value)}
        disabled={isPending}
        className="appearance-none bg-transparent pl-2 pr-3 py-2 min-h-[44px] text-sm font-semibold text-foreground focus:outline-none disabled:opacity-50"
      >
        {locales.map((l) => (
          <option key={l.code} value={l.code}>
            {l.flag} {l.label}
          </option>
        ))}
      </select>
    </label>
  );
}
