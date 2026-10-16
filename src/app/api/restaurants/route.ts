import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { validationError, isUniqueViolation } from "@/lib/api";
import {
  CURRENCIES,
  DEFAULT_SETTINGS,
  SUPPORTED_LOCALES_SCHEMA,
  enabledLocalesSchema,
  invalidDefaultLocale,
  timezoneSchema,
} from "@/lib/settings";

const restaurantSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z.string().min(1).max(120),
  domain: z.string().min(1).max(255).optional().nullable(),
  active: z.boolean().optional(),
  // Initial settings; omitted fields take the schema defaults
  currency: z.enum(CURRENCIES).optional(),
  enabled_locales: enabledLocalesSchema.optional(),
  default_locale: SUPPORTED_LOCALES_SCHEMA.optional(),
  timezone: timezoneSchema.optional(),
});

// GET /api/restaurants - List restaurants (SUPER_ADMIN)
export async function GET() {
  const session = await auth();

  if (!session || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const restaurants = await prisma.restaurant.findMany({
    orderBy: { created_at: "desc" },
  });

  return NextResponse.json(restaurants);
}

// POST /api/restaurants - Create restaurant (SUPER_ADMIN)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const validation = restaurantSchema.safeParse(body);

    if (!validation.success) {
      return validationError(validation.error);
    }

    const { currency, enabled_locales, default_locale, timezone } =
      validation.data;
    const settings = {
      currency: currency ?? DEFAULT_SETTINGS.currency,
      enabled_locales: enabled_locales ?? DEFAULT_SETTINGS.enabled_locales,
      default_locale: default_locale ?? DEFAULT_SETTINGS.default_locale,
      timezone: timezone ?? DEFAULT_SETTINGS.timezone,
    };
    const localeError = invalidDefaultLocale(
      settings.enabled_locales,
      settings.default_locale,
    );
    if (localeError) return localeError;

    const restaurant = await prisma.restaurant.create({
      data: {
        name: validation.data.name.trim(),
        slug: validation.data.slug.trim(),
        domain: validation.data.domain?.trim() || null,
        active: validation.data.active ?? true,
        settings: { create: settings },
      },
      include: { settings: true },
    });

    return NextResponse.json(restaurant, { status: 201 });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return NextResponse.json(
        { error: "A restaurant with this slug or domain already exists" },
        { status: 409 },
      );
    }
    console.error("Error creating restaurant:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
