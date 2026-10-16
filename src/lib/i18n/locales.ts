export const SUPPORTED_LOCALES = ["es", "en", "pt", "de", "nl", "fr"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export function isLocale(value: string): value is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}
