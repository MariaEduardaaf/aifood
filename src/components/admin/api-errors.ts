// Turns an API error response into a translated message.
// `t` is the ROOT translator: useTranslations() with no namespace.
type T = (key: string, values?: Record<string, string>) => string;

const KNOWN_FIELDS = new Set([
  "password", "email", "name", "names", "descriptions", "price", "slug", "label",
  "timezone", "currency", "google_reviews_url", "role", "domain", "url", "csv",
  "enabled_locales", "default_locale",
]);

interface ApiErrorBody {
  issues?: { path?: (string | number)[] }[];
}

export function apiErrorMessage(status: number, data: unknown, t: T): string {
  if (status === 400) {
    const issues = (data as ApiErrorBody | null)?.issues;
    if (Array.isArray(issues) && issues.length > 0) {
      const labels = issues.map((i) => {
        const head = String(i.path?.[0] ?? "");
        return KNOWN_FIELDS.has(head) ? t(`errors.fields.${head}`) : head;
      });
      const fields = Array.from(new Set(labels)).filter(Boolean);
      if (fields.length > 0) return t("errors.invalidFields", { fields: fields.join(", ") });
    }
  }
  if (status === 409) return t("errors.conflict");
  if (status === 403) return t("errors.forbidden");
  if (status === 413) return t("errors.tooLarge");
  if (status === 503) return t("errors.uploadsNotConfigured");
  return t("errors.generic");
}

export async function readApiError(res: Response, t: T): Promise<string> {
  const data = await res.json().catch(() => null);
  return apiErrorMessage(res.status, data, t);
}
