"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Settings, Star, ExternalLink, Loader2, Check } from "lucide-react";

interface SettingsData {
  id: string;
  google_reviews_url: string | null;
  google_reviews_enabled: boolean;
  min_stars_redirect: number;
}

export default function ConfiguracoesPage() {
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");

  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [googleUrl, setGoogleUrl] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [minStars, setMinStars] = useState(4);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const data = await res.json();
          setSettings(data);
          setGoogleUrl(data.google_reviews_url || "");
          setEnabled(data.google_reviews_enabled);
          setMinStars(data.min_stars_redirect);
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

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          google_reviews_url: googleUrl || null,
          google_reviews_enabled: enabled,
          min_stars_redirect: minStars,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err) {
      console.error("Error saving settings:", err);
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
        <h1 className="text-3xl font-bold text-gold flex items-center gap-3">
          <Settings className="h-8 w-8" />
          {t("settings")}
        </h1>
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
              Configure o redirecionamento para Google Reviews
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* URL Input */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {t("googleReviewsUrl")}
            </label>
            <input
              type="url"
              value={googleUrl}
              onChange={(e) => setGoogleUrl(e.target.value)}
              placeholder={t("googleReviewsUrlPlaceholder")}
              className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Dica: Use o formato https://search.google.com/local/writereview?placeid=SEU_PLACE_ID
            </p>
          </div>

          {/* Enable Toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 border border-border/30">
            <div>
              <label className="text-sm font-medium text-foreground">
                {t("googleReviewsEnabled")}
              </label>
              <p className="text-xs text-muted-foreground mt-1">
                Redireciona clientes com notas altas para o Google
              </p>
            </div>
            <button
              onClick={() => setEnabled(!enabled)}
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

          {/* Minimum Stars */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-3">
              {t("minStarsRedirect")}
            </label>
            <div className="flex items-center gap-4">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setMinStars(star)}
                    className="p-1 transition-transform hover:scale-110"
                  >
                    <Star
                      className={`h-8 w-8 transition-colors ${
                        star <= minStars
                          ? "fill-primary text-primary"
                          : "text-muted-foreground/30"
                      }`}
                    />
                  </button>
                ))}
              </div>
              <span className="text-sm text-muted-foreground">
                {minStars}+ estrelas
              </span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Clientes que derem {minStars} ou mais estrelas serão redirecionados ao Google Reviews
            </p>
          </div>
        </div>

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

          {googleUrl && (
            <a
              href={googleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary-premium px-4 py-3 rounded-xl font-medium flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Testar URL
            </a>
          )}
        </div>
      </div>

      {/* Info Card */}
      <div className="card-premium rounded-2xl p-6 border-l-4 border-l-primary">
        <h3 className="font-semibold text-foreground mb-2">Como funciona?</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>1. Quando um chamado é resolvido, o cliente vê uma tela de avaliação</li>
          <li>2. Se a nota for {minStars}+ estrelas, o cliente é convidado a avaliar no Google</li>
          <li>3. Notas baixas ficam apenas no sistema interno com feedback privado</li>
          <li>4. Isso ajuda a aumentar as avaliações positivas no Google</li>
        </ul>
      </div>
    </div>
  );
}
