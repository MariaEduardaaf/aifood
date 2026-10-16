// Pick the text for `locale` from a { locale: text } map, falling back to `fallback`
// (the restaurant default locale), then to any non-empty value.
// Accepts Prisma Json values as-is, so callers do not need to cast.
export function localizedText(
  map: unknown,
  locale: string,
  fallback: string,
): string {
  if (!map || typeof map !== "object" || Array.isArray(map)) return "";
  const m = map as Record<string, unknown>;
  const pick = (key: string) => (typeof m[key] === "string" ? (m[key] as string) : "");
  return (
    pick(locale) ||
    pick(fallback) ||
    (Object.values(m).find((v) => typeof v === "string" && v) as string | undefined) ||
    ""
  );
}
