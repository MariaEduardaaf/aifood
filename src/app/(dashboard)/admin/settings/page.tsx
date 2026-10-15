"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { ExternalLink, Loader2, Check } from "lucide-react";
import { isHttpUrl } from "@/lib/utils";

interface SettingsData {
  id: string;
  google_reviews_url: string | null;
  google_reviews_enabled: boolean;
  min_stars_redirect: number;
  currency?: string;
}

const CURRENCIES = ["EUR", "BRL", "USD", "GBP"];

export default function SettingsPage() {
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");
  const tErr = useTranslations("errors");

  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [googleUrl, setGoogleUrl] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [currency, setCurrency] = useState("EUR");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const data = await res.json();
          setSettings(data);
          setGoogleUrl(data.google_reviews_url || "");
          setEnabled(data.google_reviews_enabled);
          setCurrency(data.currency || "EUR");
        }
      } catch (err) {
        console.error("Error fetching settings:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError(null);

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          google_reviews_url: googleUrl || null,
          google_reviews_enabled: enabled,
          currency,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(typeof data.error === "string" ? data.error : tErr("generic"));
      }
    } catch (err) {
      console.error("Error saving settings:", err);
      setError(tErr("generic"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{t("settings")}</h1>
      </div>

      {/* Google Reviews Card */}
      <div className="card-premium rounded-2xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <ExternalLink className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              {t("googleReviews")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("settingsPage.googleReviewsSubtitle")}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* URL Input */}
          <div>
            <label
              htmlFor="google-url"
              className="block text-sm font-medium text-foreground mb-2"
            >
              {t("googleReviewsUrl")}
            </label>
            <input
              id="google-url"
              type="url"
              value={googleUrl}
              onChange={(e) => setGoogleUrl(e.target.value)}
              placeholder={t("googleReviewsUrlPlaceholder")}
              className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              {t("settingsPage.urlTip")}
            </p>
          </div>

          {/* Enable Toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 border border-border/30">
            <div>
              <label className="text-sm font-medium text-foreground">
                {t("googleReviewsEnabled")}
              </label>
              <p className="text-xs text-muted-foreground mt-1">
                {t("settingsPage.redirectDescription")}
              </p>
            </div>
            <button
              onClick={() => setEnabled(!enabled)}
              role="switch"
              aria-checked={enabled}
              aria-label={t("googleReviewsEnabled")}
              className={`relative w-14 h-7 rounded-full transition-colors ${
                enabled ? "bg-primary" : "bg-secondary"
              }`}
            >
              <div
                className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${
                  enabled ? "translate-x-8" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Currency */}
          <div>
            <label
              htmlFor="currency"
              className="block text-sm font-medium text-foreground mb-2"
            >
              {t("settingsPage.currency")}
            </label>
            <select
              id="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-muted-foreground">
              {t("settingsPage.currencyHint")}
            </p>
          </div>
        </div>

        {error && (
          <p role="alert" className="mt-6 text-sm text-red-600">
            {error}
          </p>
        )}

        {/* Save Button */}
        <div className="mt-8 flex items-center gap-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-gold px-6 py-3 rounded-xl font-medium flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : saved ? (
              <Check className="h-5 w-5" />
            ) : null}
            {saved ? t("settingsSaved") : tCommon("save")}
          </button>

          {isHttpUrl(googleUrl) && (
            <a
              href={googleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary-premium px-4 py-3 rounded-xl font-medium flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              {t("settingsPage.testUrl")}
            </a>
          )}
        </div>
      </div>

      {/* Info Card */}
      <div className="card-premium rounded-2xl p-6 border-l-4 border-l-primary">
        <h3 className="font-semibold text-foreground mb-2">{t("settingsPage.howItWorks")}</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>
            {t("settingsPage.step1")}
          </li>
          <li>{t("settingsPage.step4")}</li>
        </ul>
      </div>
    </div>
  );
}
