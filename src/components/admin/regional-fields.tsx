"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { SUPPORTED_LOCALES } from "@/lib/i18n/locales";

export const CURRENCIES = ["EUR", "GBP", "USD", "BRL"];

export const fieldClass =
  "w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50";

function useLangName() {
  const locale = useLocale();
  return useMemo(() => {
    const dn = new Intl.DisplayNames([locale], { type: "language" });
    return (code: string) => {
      const n = dn.of(code) ?? code;
      return n.charAt(0).toUpperCase() + n.slice(1);
    };
  }, [locale]);
}

// Checkbox per supported language + a default-language radio. The default is
// always enabled and at least one language stays on.
export function LanguageFields({
  enabled,
  defaultLocale,
  onChange,
}: {
  enabled: string[];
  defaultLocale: string;
  onChange: (next: { enabled_locales: string[]; default_locale: string }) => void;
}) {
  const t = useTranslations("admin.settingsPage");
  const langName = useLangName();

  const toggle = (code: string) => {
    const on = enabled.includes(code);
    if (on && (enabled.length === 1 || code === defaultLocale)) return;
    onChange({
      default_locale: defaultLocale,
      enabled_locales: on
        ? enabled.filter((l) => l !== code)
        : SUPPORTED_LOCALES.filter((l) => l === code || enabled.includes(l)),
    });
  };

  return (
    <fieldset>
      <legend className="sr-only">{t("languages")}</legend>
      <ul className="grid gap-2 sm:grid-cols-2">
        {SUPPORTED_LOCALES.map((code) => {
          const isOn = enabled.includes(code);
          return (
            <li
              key={code}
              className={`flex min-h-[48px] items-center justify-between gap-3 rounded-xl border px-4 py-2 ${
                isOn ? "border-primary/60 bg-primary/5" : "border-border/50 bg-secondary/30"
              }`}
            >
              <label className="flex flex-1 cursor-pointer items-center gap-3 text-sm font-medium text-foreground">
                <input
                  type="checkbox"
                  checked={isOn}
                  onChange={() => toggle(code)}
                  className="h-5 w-5 accent-[hsl(var(--primary))]"
                />
                {langName(code)}
              </label>
              <label
                className={`flex items-center gap-2 text-xs ${
                  isOn ? "cursor-pointer text-muted-foreground" : "opacity-40"
                }`}
              >
                <input
                  type="radio"
                  name="default_locale"
                  checked={defaultLocale === code}
                  disabled={!isOn}
                  onChange={() => onChange({ enabled_locales: enabled, default_locale: code })}
                  className="h-4 w-4 accent-[hsl(var(--primary))]"
                />
                {t("defaultLanguage")}
              </label>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}

// IANA zones grouped by region, Europe first; the current value is always listed.
export function TimezoneSelect({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const groups = useMemo(() => {
    const all =
      (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.(
        "timeZone",
      ) ?? [];
    const zones = new Set(all);
    if (value) zones.add(value);
    const byRegion = new Map<string, string[]>();
    for (const z of Array.from(zones).sort()) {
      const region = z.includes("/") ? z.split("/")[0] : "Other";
      byRegion.set(region, [...(byRegion.get(region) ?? []), z]);
    }
    return Array.from(byRegion.entries()).sort(([a], [b]) =>
      a === "Europe" ? -1 : b === "Europe" ? 1 : a.localeCompare(b),
    );
  }, [value]);

  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={fieldClass}>
      {groups.map(([region, zones]) => (
        <optgroup key={region} label={region}>
          {zones.map((z) => (
            <option key={z} value={z}>
              {z.replace(/_/g, " ")}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
