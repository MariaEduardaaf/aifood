-- Settings: per-restaurant languages, lite mode, timezone
ALTER TABLE "Settings" ADD COLUMN     "default_locale" TEXT NOT NULL DEFAULT 'es',
ADD COLUMN     "enabled_locales" TEXT[] DEFAULT ARRAY['es', 'en']::TEXT[],
ADD COLUMN     "ordering_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'Europe/Madrid';

-- Category: fixed pt/es/en columns become a JSON map keyed by locale
ALTER TABLE "Category" ADD COLUMN "names" JSONB;
UPDATE "Category" SET "names" = jsonb_strip_nulls(jsonb_build_object('pt', "name_pt", 'es', "name_es", 'en', "name_en"));
ALTER TABLE "Category" ALTER COLUMN "names" SET NOT NULL;
ALTER TABLE "Category" DROP COLUMN "name_en",
DROP COLUMN "name_es",
DROP COLUMN "name_pt";

-- MenuItem: same for names and descriptions, plus allergens
ALTER TABLE "MenuItem" ADD COLUMN "names" JSONB,
ADD COLUMN "descriptions" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN "allergens" TEXT[] DEFAULT ARRAY[]::TEXT[];
UPDATE "MenuItem" SET
  "names" = jsonb_strip_nulls(jsonb_build_object('pt', "name_pt", 'es', "name_es", 'en', "name_en")),
  "descriptions" = jsonb_strip_nulls(jsonb_build_object('pt', "description_pt", 'es', "description_es", 'en', "description_en"));
ALTER TABLE "MenuItem" ALTER COLUMN "names" SET NOT NULL;
ALTER TABLE "MenuItem" DROP COLUMN "description_en",
DROP COLUMN "description_es",
DROP COLUMN "description_pt",
DROP COLUMN "name_en",
DROP COLUMN "name_es",
DROP COLUMN "name_pt";

-- Login throttling
CREATE TABLE "LoginAttempt" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LoginAttempt_email_created_at_idx" ON "LoginAttempt"("email", "created_at");
