"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useSound } from "@/components/providers/sound-provider";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export function SoundSettings() {
  const t = useTranslations("settings");
  const { settings, updateSettings, playNotification } = useSound();

  return (
    <div className="space-y-4 p-4 card-premium rounded-xl">
      <h3 className="font-semibold flex items-center gap-2">
        {settings.enabled ? (
          <Volume2 className="h-5 w-5 text-primary" />
        ) : (
          <VolumeX className="h-5 w-5 text-muted-foreground" />
        )}
        {t("sound.title")}
      </h3>

      {/* Toggle */}
      <div className="flex items-center justify-between">
        <span className="text-sm">{t("sound.enabled")}</span>
        <button
          onClick={() => updateSettings({ enabled: !settings.enabled })}
          className={cn(
            "w-12 h-6 rounded-full transition-colors relative",
            settings.enabled ? "bg-primary" : "bg-secondary"
          )}
        >
          <span
            className={cn(
              "absolute top-1 w-4 h-4 rounded-full bg-white transition-transform shadow-sm",
              settings.enabled ? "translate-x-7" : "translate-x-1"
            )}
          />
        </button>
      </div>

      {/* Volume Slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm">{t("sound.volume")}</span>
          <span className="text-sm text-muted-foreground">{settings.volume}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={settings.volume}
          onChange={(e) => updateSettings({ volume: Number(e.target.value) })}
          disabled={!settings.enabled}
          className={cn(
            "w-full h-2 rounded-full appearance-none cursor-pointer",
            "bg-secondary",
            "[&::-webkit-slider-thumb]:appearance-none",
            "[&::-webkit-slider-thumb]:w-4",
            "[&::-webkit-slider-thumb]:h-4",
            "[&::-webkit-slider-thumb]:rounded-full",
            "[&::-webkit-slider-thumb]:bg-primary",
            "[&::-webkit-slider-thumb]:shadow-md",
            "[&::-webkit-slider-thumb]:cursor-pointer",
            "[&::-moz-range-thumb]:w-4",
            "[&::-moz-range-thumb]:h-4",
            "[&::-moz-range-thumb]:rounded-full",
            "[&::-moz-range-thumb]:bg-primary",
            "[&::-moz-range-thumb]:border-0",
            "[&::-moz-range-thumb]:cursor-pointer",
            !settings.enabled && "opacity-50 cursor-not-allowed"
          )}
        />
      </div>

      {/* Test Button */}
      <button
        onClick={playNotification}
        disabled={!settings.enabled}
        className={cn(
          "w-full py-2 px-4 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors text-sm font-medium",
          !settings.enabled && "opacity-50 cursor-not-allowed"
        )}
      >
        {t("sound.test")}
      </button>
    </div>
  );
}

export function SoundToggleCompact() {
  const { settings, updateSettings } = useSound();

  return (
    <button
      onClick={() => updateSettings({ enabled: !settings.enabled })}
      className={cn(
        "p-2 rounded-lg border border-border/50 transition-all duration-200",
        settings.enabled
          ? "bg-secondary/50 text-foreground"
          : "bg-secondary/30 text-muted-foreground"
      )}
      title={settings.enabled ? "Som ativado" : "Som desativado"}
    >
      {settings.enabled ? (
        <Volume2 className="h-5 w-5" />
      ) : (
        <VolumeX className="h-5 w-5" />
      )}
    </button>
  );
}
