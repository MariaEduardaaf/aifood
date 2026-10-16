import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { SUPPORTED_LOCALES } from "@/lib/i18n/locales";

// Settings fields most routes need, with the schema defaults for restaurants
// that have no Settings row yet
export const settingsSelect = {
  currency: true,
  default_locale: true,
  enabled_locales: true,
  ordering_enabled: true,
  timezone: true,
} as const;

export type CoreSettings = {
  currency: string;
  default_locale: string;
  enabled_locales: string[];
  ordering_enabled: boolean;
  timezone: string;
};

export const DEFAULT_SETTINGS: CoreSettings = {
  currency: "EUR",
  default_locale: "es",
  enabled_locales: ["es", "en"],
  ordering_enabled: true,
  timezone: "Europe/Madrid",
};

export async function getSettings(
  restaurantId: string | null | undefined,
): Promise<CoreSettings> {
  if (!restaurantId) return DEFAULT_SETTINGS;
  const settings = await prisma.settings.findUnique({
    where: { restaurant_id: restaurantId },
    select: settingsSelect,
  });
  return settings ?? DEFAULT_SETTINGS;
}

export const CURRENCIES = ["EUR", "BRL", "USD", "GBP"] as const;

const TIMEZONES = new Set(Intl.supportedValuesOf("timeZone"));

export const timezoneSchema = z
  .string()
  .refine((tz) => tz === "UTC" || TIMEZONES.has(tz), "Unknown IANA timezone");

export const SUPPORTED_LOCALES_SCHEMA = z.enum(SUPPORTED_LOCALES);

export const enabledLocalesSchema = z
  .array(SUPPORTED_LOCALES_SCHEMA)
  .min(1)
  .max(SUPPORTED_LOCALES.length)
  .transform((locales) => Array.from(new Set(locales)));

// 400 unless the default locale is one of the enabled ones
export function invalidDefaultLocale(enabled: string[], defaultLocale: string) {
  if (enabled.includes(defaultLocale)) return null;
  return NextResponse.json(
    { error: "default_locale: must be one of enabled_locales" },
    { status: 400 },
  );
}
