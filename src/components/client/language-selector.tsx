"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Globe } from "lucide-react";

// Language name in its own language ("Español", "English"), capitalized
export function nativeLanguageName(code: string): string {
  try {
    const name = new Intl.DisplayNames([code], { type: "language" }).of(code) ?? code;
    return name.charAt(0).toLocaleUpperCase(code) + name.slice(1);
  } catch {
    return code.toUpperCase();
  }
}

export function setLocaleCookie(locale: string) {
  document.cookie = `locale=${locale};path=/;max-age=31536000;samesite=lax`;
}

// Compact native <select> limited to the restaurant's languages; hidden when
// there is nothing to choose.
export function LanguageSelector({ locales }: { locales: string[] }) {
  const router = useRouter();
  const current = useLocale();
  const t = useTranslations("client");
  const [isPending, startTransition] = useTransition();

  if (locales.length < 2) return null;
  const options = locales.includes(current) ? locales : [current, ...locales];

  return (
    <label className="relative flex min-h-[44px] items-center rounded-full border border-border bg-card focus-within:ring-2 focus-within:ring-ring">
      <Globe aria-hidden className="pointer-events-none ml-3 h-4 w-4 text-muted-foreground" />
      <select
        aria-label={t("language")}
        value={current}
        disabled={isPending}
        onChange={(e) => {
          setLocaleCookie(e.target.value);
          startTransition(() => router.refresh());
        }}
        className="min-h-[44px] appearance-none bg-transparent py-2 pl-2 pr-4 text-sm font-medium text-foreground focus:outline-none disabled:opacity-50"
      >
        {options.map((code) => (
          <option key={code} value={code}>
            {nativeLanguageName(code)}
          </option>
        ))}
      </select>
    </label>
  );
}
