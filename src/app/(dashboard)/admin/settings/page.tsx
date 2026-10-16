"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { ExternalLink, Loader2, Globe, ShoppingBag, Clock } from "lucide-react";
import { isHttpUrl } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { CURRENCIES, LanguageFields, TimezoneSelect, fieldClass } from "@/components/admin/regional-fields";

interface SettingsData {
  currency: string;
  default_locale: string;
  enabled_locales: string[];
  ordering_enabled: boolean;
  timezone: string;
  google_reviews_url: string | null;
  google_reviews_enabled: boolean;
}


function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`relative h-7 w-14 flex-shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
        checked ? "bg-primary" : "bg-muted-foreground/40"
      }`}
    >
      <span
        className={`absolute left-0 top-1 h-5 w-5 rounded-full bg-white transition-transform ${
          checked ? "translate-x-8" : "translate-x-1"
        }`}
      />
    </button>
  );
}

function Section({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: typeof Globe;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card-premium rounded-2xl p-6 sm:p-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <div className="space-y-6">{children}</div>
    </section>
  );
}

export default function SettingsPage() {
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");
  const tErr = useTranslations("errors");
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<SettingsData | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) =>
        setForm({
          currency: d.currency || "EUR",
          default_locale: d.default_locale || "es",
          enabled_locales: d.enabled_locales?.length ? d.enabled_locales : ["es"],
          ordering_enabled: d.ordering_enabled ?? true,
          timezone: d.timezone || "Europe/Madrid",
          google_reviews_url: d.google_reviews_url,
          google_reviews_enabled: d.google_reviews_enabled ?? true,
        }),
      )
      .catch(() => toast(tErr("generic"), "error"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading || !form) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        {loading ? (
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        ) : (
          <p role="alert" className="text-muted-foreground">
            {tErr("generic")}
          </p>
        )}
      </div>
    );
  }

  const set = (patch: Partial<SettingsData>) => setForm({ ...form, ...patch });

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          google_reviews_url: form.google_reviews_url?.trim() || null,
        }),
      });
      if (res.ok) {
        toast(t("settingsSaved"), "success");
      } else {
        const data = await res.json().catch(() => ({}));
        const msg = typeof data.error === "string" ? data.error : tErr("generic");
        setError(msg);
        toast(msg, "error");
      }
    } catch {
      setError(tErr("generic"));
      toast(tErr("generic"), "error");
    } finally {
      setSaving(false);
    }
  };

  const googleUrl = form.google_reviews_url ?? "";

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">{t("settings")}</h1>

      <Section
        icon={Globe}
        title={t("settingsPage.languages")}
        subtitle={t("settingsPage.languagesSubtitle")}
      >
        <LanguageFields
          enabled={form.enabled_locales}
          defaultLocale={form.default_locale}
          onChange={set}
        />
        <p className="text-xs text-muted-foreground">{t("settingsPage.languagesHint")}</p>
      </Section>

      <Section
        icon={ShoppingBag}
        title={t("settingsPage.ordering")}
        subtitle={t("settingsPage.orderingSubtitle")}
      >
        <div className="flex items-center justify-between gap-4 rounded-xl border border-border/30 bg-secondary/30 p-4">
          <div>
            <p className="text-sm font-medium text-foreground">{t("settingsPage.orderingEnabled")}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("settingsPage.orderingLite")}</p>
          </div>
          <Switch
            checked={form.ordering_enabled}
            onChange={(v) => set({ ordering_enabled: v })}
            label={t("settingsPage.orderingEnabled")}
          />
        </div>
      </Section>

      <Section
        icon={Clock}
        title={t("settingsPage.regional")}
        subtitle={t("settingsPage.regionalSubtitle")}
      >
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="timezone" className="mb-2 block text-sm font-medium text-foreground">
              {t("settingsPage.timezone")}
            </label>
            <TimezoneSelect id="timezone" value={form.timezone} onChange={(v) => set({ timezone: v })} />
            <p className="mt-2 text-xs text-muted-foreground">{t("settingsPage.timezoneHint")}</p>
          </div>
          <div>
            <label htmlFor="currency" className="mb-2 block text-sm font-medium text-foreground">
              {t("settingsPage.currency")}
            </label>
            <select
              id="currency"
              value={form.currency}
              onChange={(e) => set({ currency: e.target.value })}
              className={fieldClass}
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-muted-foreground">{t("settingsPage.currencyHint")}</p>
          </div>
        </div>
      </Section>

      <Section
        icon={ExternalLink}
        title={t("googleReviews")}
        subtitle={t("settingsPage.googleReviewsSubtitle")}
      >
        <div>
          <label htmlFor="google-url" className="mb-2 block text-sm font-medium text-foreground">
            {t("googleReviewsUrl")}
          </label>
          <input
            id="google-url"
            type="url"
            value={googleUrl}
            onChange={(e) => set({ google_reviews_url: e.target.value })}
            placeholder={t("googleReviewsUrlPlaceholder")}
            className={fieldClass}
          />
          <p className="mt-2 text-xs text-muted-foreground">{t("settingsPage.urlTip")}</p>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-xl border border-border/30 bg-secondary/30 p-4">
          <div>
            <p className="text-sm font-medium text-foreground">{t("googleReviewsEnabled")}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("settingsPage.redirectDescription")}</p>
          </div>
          <Switch
            checked={form.google_reviews_enabled}
            onChange={(v) => set({ google_reviews_enabled: v })}
            label={t("googleReviewsEnabled")}
          />
        </div>

        {isHttpUrl(googleUrl) && (
          <a
            href={googleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary-premium inline-flex items-center gap-2 rounded-xl px-4 py-3 font-medium"
          >
            <ExternalLink className="h-4 w-4" />
            {t("settingsPage.testUrl")}
          </a>
        )}
      </Section>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex items-center gap-4">
        <button
          onClick={save}
          disabled={saving}
          className="btn-gold flex min-h-[44px] items-center gap-2 rounded-xl px-6 py-3 font-medium disabled:opacity-50"
        >
          {saving && <Loader2 className="h-5 w-5 animate-spin" />}
          {tCommon("save")}
        </button>
      </div>
    </div>
  );
}
