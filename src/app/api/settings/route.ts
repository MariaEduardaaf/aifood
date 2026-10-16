import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { restaurantNotFound, validationError } from "@/lib/api";
import {
  CURRENCIES,
  DEFAULT_SETTINGS,
  SUPPORTED_LOCALES_SCHEMA,
  enabledLocalesSchema,
  invalidDefaultLocale,
  timezoneSchema,
} from "@/lib/settings";

export const dynamic = "force-dynamic";

const settingsSchema = z.object({
  google_reviews_url: z
    .string()
    .url()
    .regex(/^https?:\/\//i, "Must be an http(s) URL")
    .optional()
    .nullable(),
  google_reviews_enabled: z.boolean().optional(),
  min_stars_redirect: z.number().int().min(1).max(5).optional(),
  currency: z.enum(CURRENCIES).optional(),
  enabled_locales: enabledLocalesSchema.optional(),
  default_locale: SUPPORTED_LOCALES_SCHEMA.optional(),
  ordering_enabled: z.boolean().optional(),
  timezone: timezoneSchema.optional(),
  restaurantId: z.string().optional(),
});

// GET /api/settings - Get settings
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    // Any staff member can read settings (the UI needs currency); nothing secret
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const restaurantIdParam = searchParams.get("restaurantId");
    const restaurantId =
      session.user.role === "SUPER_ADMIN"
        ? restaurantIdParam
        : session.user.restaurant_id;

    if (!restaurantId) {
      return NextResponse.json(
        { error: "restaurantId is required" },
        { status: 400 },
      );
    }

    if (session.user.role === "SUPER_ADMIN") {
      const notFound = await restaurantNotFound(restaurantId);
      if (notFound) return notFound;
    }

    let settings = await prisma.settings.findUnique({
      where: { restaurant_id: restaurantId },
    });

    // Create default settings if not exists
    if (!settings) {
      settings = await prisma.settings.create({
        data: {
          google_reviews_url: null,
          google_reviews_enabled: true,
          min_stars_redirect: 4,
          restaurant_id: restaurantId,
        },
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// PUT /api/settings - Update settings
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const validation = settingsSchema.safeParse(body);

    if (!validation.success) {
      return validationError(validation.error);
    }

    const restaurantId =
      session.user.role === "SUPER_ADMIN"
        ? validation.data.restaurantId
        : session.user.restaurant_id;

    if (!restaurantId) {
      return NextResponse.json(
        { error: "restaurantId is required" },
        { status: 400 },
      );
    }

    if (session.user.role === "SUPER_ADMIN") {
      const notFound = await restaurantNotFound(restaurantId);
      if (notFound) return notFound;
    }

    // restaurantId is input-only; the column is restaurant_id
    const { restaurantId: _restaurantId, ...data } = validation.data;

    const existing = await prisma.settings.findUnique({
      where: { restaurant_id: restaurantId },
      select: { enabled_locales: true, default_locale: true },
    });
    const localeError = invalidDefaultLocale(
      data.enabled_locales ??
        existing?.enabled_locales ??
        DEFAULT_SETTINGS.enabled_locales,
      data.default_locale ??
        existing?.default_locale ??
        DEFAULT_SETTINGS.default_locale,
    );
    if (localeError) return localeError;

    const settings = await prisma.settings.upsert({
      where: { restaurant_id: restaurantId },
      update: data,
      create: {
        ...data,
        restaurant_id: restaurantId,
      },
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
