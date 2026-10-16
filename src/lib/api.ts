import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z, type ZodError } from "zod";
import { SUPPORTED_LOCALES } from "@/lib/i18n/locales";
import { ALLERGEN_CODES } from "@/lib/allergens";

// Standard 400 for zod failures: `error` is always a renderable string.
export function validationError(error: ZodError) {
  const first = error.issues[0];
  const message = first
    ? (first.path.length ? `${first.path.join(".")}: ` : "") + first.message
    : "Invalid data";
  return NextResponse.json(
    { error: message, issues: error.issues },
    { status: 400 },
  );
}

// True when Prisma rejected a write because of a unique constraint
export function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

// { "<locale>": "text" } map limited to supported locales; empty strings are
// dropped so sending "" clears a translation
export function localeTextMap(max: number) {
  return z
    .partialRecord(z.enum(SUPPORTED_LOCALES), z.string().trim().max(max))
    .transform(
      (map) =>
        Object.fromEntries(
          Object.entries(map).filter(([, text]) => !!text),
        ) as Record<string, string>,
    );
}

// EU allergen codes, de-duplicated
export const allergensSchema = z
  .array(z.enum(ALLERGEN_CODES))
  .max(ALLERGEN_CODES.length)
  .transform((codes) => Array.from(new Set(codes)));

// 400 unless the names map has text for the restaurant's default locale
export function missingDefaultLocale(
  names: Record<string, string>,
  defaultLocale: string,
) {
  if (names[defaultLocale]) return null;
  return NextResponse.json(
    { error: `names.${defaultLocale}: required (restaurant default language)` },
    { status: 400 },
  );
}
