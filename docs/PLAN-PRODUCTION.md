# Production readiness plan

> Status: in progress (2026-10-16). Branch `feat/production` on top of `fix/audit`.
> Goal: a version a Spanish cafe can run on day one, sold either bundled with the
> studio's website or standalone. Everything here is scoped to what that first
> customer needs; payments, POS, printers and Verifactu stay out.

## Decisions (made 2026-10-16)

| Topic | Decision | Why |
|---|---|---|
| Menu languages | Per restaurant: `Settings.enabled_locales` from the supported set `es, en, pt, de, nl, fr`; `Settings.default_locale` is the fallback. Content stored as JSON maps (`Category.names`, `MenuItem.names`, `MenuItem.descriptions`) keyed by locale. | Fixed pt/es/en columns cannot serve Alicante (UK, NL, DE tourists). JSON map avoids a translation table and a join per request. |
| UI languages | Same six locales in `messages/*.json`. Guest UI offers only the restaurant's enabled locales; staff UI offers all six. | One source of truth for locale codes: `src/lib/i18n/locales.ts`. |
| Allergens | `MenuItem.allergens: string[]` using the 14 EU codes in `src/lib/allergens.ts`; shown as icons + legend on the guest menu, editable in admin. | Legal requirement in Spain (RD 126/2015). |
| Lite mode | `Settings.ordering_enabled`. When false, guests get menu + call waiter + request bill; the orders API returns 403; staff screens hide order columns. | Most cafes start without self-ordering. |
| Real time | In-process event bus (`src/lib/events.ts`) fed by the order/call routes; SSE routes subscribe and push instantly, with a 25s heartbeat and a 30s safety poll. No DB polling every 2s. | Works on any long-running host with one instance. `ponytail:` single instance; move to Redis pub/sub when scaling. |
| Hosting | Long-running Node host (Railway or Fly) via the Dockerfile; Vercel only for previews. Health check at `/api/health`. | SSE + in-process bus do not fit serverless. |
| Schema changes | Prisma migrations (`prisma/migrations`), applied with `prisma migrate deploy`. `db push` is no longer used. | Production needs reproducible schema history. |
| Timezone | `Settings.timezone` (IANA). Metrics compute day/hour buckets in that zone. | Server runs in UTC. |
| Public API identity | Guest endpoints take `qr_token` (`table` query/body field), never the table id. | Ids were guessable and permanent. |
| Login throttling | `LoginAttempt` table: max 5 failed attempts per email per 15 min. | No new dependency; works across instances. |
| Toasts | `src/components/ui/toast.tsx` (`ToastProvider` + `useToast`). Every mutation shows success or error. | Silent actions were the top UX complaint. |
| Waiter alerts | Sound + vibration + Screen Wake Lock while the staff page is open. Web push is out of scope. | Push needs VAPID keys and a service worker; later. |
| Photos | Cloudinary upload already exists; guest menu shows photos when present and no placeholder box when absent. Item detail sheet on tap. | Grey placeholders made the menu look unfinished. |
| Menu import | `POST /api/admin/menu/import` takes a CSV (published Google Sheet URL or file). Columns: `category, name_<locale>..., description_<locale>..., price, allergens, image_url`. | Loading a menu by hand at install time is the slowest step. |
| Tests | `node --test` via tsx: unit tests for pure helpers and an API smoke test against a running server (`npm run test`, `npm run test:smoke`). | No test framework dependency. |
| Legal pages | `/privacy` and `/cookies` static pages in es/en (template text, to be reviewed by a lawyer). | RGPD. |

## Phases

### Phase 0: foundation (done by the coordinator)
- Schema + migrations `0001_init`, `0002_locales_allergens_lite`.
- `src/lib/allergens.ts`, `src/components/ui/toast.tsx`, this plan.

### Phase 1: parallel build (three agents, disjoint file scopes)

**A. Backend** (`src/app/api/**`, `src/lib/**` except utils.ts, `src/middleware.ts`, `prisma/seed.ts`, `Dockerfile`, `.dockerignore`, `next.config.mjs`, `package.json` scripts, `scripts/**`, `docs/DEPLOY.md`)
1. Locale helpers: `src/lib/i18n/locales.ts` (`SUPPORTED_LOCALES`, `isLocale`), `localizedText(map, locale, fallback)` in `src/lib/i18n/text.ts`.
2. Categories/items API on JSON maps, validated with zod (`names` must contain the restaurant's default locale; keys limited to supported locales; strings max 120/500). Allergens validated against the codes.
3. Settings API: `enabled_locales`, `default_locale` (must be in enabled), `ordering_enabled`, `timezone` (validated with `Intl.supportedValuesOf("timeZone")`).
4. Public endpoints by `qr_token`: `GET /api/menu?table=<token>` returns `{ restaurant: { name }, settings: { currency, enabled_locales, default_locale, ordering_enabled }, categories: [...] }`; `POST /api/orders` and `POST /api/calls` take `{ table: <token>, ... }`; `GET /api/orders?table=<token>`; `GET /api/tables/status?table=<token>` replaces `/api/tables/[id]/status`; `POST /api/review` unchanged. Old id-based public endpoints removed.
5. Lite mode: orders POST/GET return 403 `{ error: "ordering_disabled" }` when `ordering_enabled` is false.
6. Event bus + SSE rewrite (`src/lib/events.ts`, `orders/stream`, `calls/stream`): emit on every order/call create and status change; stream sends the changed record; heartbeat; 30s safety poll; `maxDuration` not needed on a Node host.
7. Metrics in restaurant timezone (`src/lib/metrics.ts` uses `Settings.timezone` with `Intl.DateTimeFormat` parts).
8. Login throttling in the credentials `authorize` (count `LoginAttempt` in last 15 min, insert on failure, delete on success).
9. `GET /api/health` (DB ping) and `POST /api/admin/menu/import` (CSV, no dependency: split lines, handle quoted commas).
10. Seed on the new model (Spanish cafe sample in es/en, allergens filled, EUR, ordering on).
11. `Dockerfile` (multi-stage, `output: "standalone"`), `.dockerignore`, `npm run start` runs `prisma migrate deploy` then the server, `docs/DEPLOY.md` (Railway and Fly steps, env vars, first admin creation via `npm run create-admin` script).
12. Tests: `scripts/test/*.test.ts` unit tests for `localizedText`, period ranges, CSV parser, `safeCallbackUrl`; `scripts/smoke.test.ts` for the API contract above.

**B. Guest and staff UI** (`src/components/client/**`, `src/components/waiter/**`, `src/components/kitchen/**`, `src/components/providers/**`, `src/app/(public)/**`, `src/app/(dashboard)/waiter/**`, `src/app/(dashboard)/kitchen/**`, `src/app/privacy/**`, `src/app/cookies/**`, `src/app/globals.css`, `src/app/layout.tsx`, `src/lib/utils.ts`, `messages/{pt,es,en}.json` keys under `client`, `menu`, `cart`, `orders`, `waiter`, `kitchen`, `allergens`, `legal`, `common`)
1. Guest page consumes the new `/api/menu?table=` shape; language selector limited to `enabled_locales`; currency from settings; lite mode hides ordering and "My orders".
2. Menu: photos when present (no placeholder otherwise), item detail bottom sheet (photo, description, allergens with icons, stepper), allergen icon row on cards, legend + "filter out items containing" chips.
3. Toasts on order placed, call sent, bill requested, rating sent, errors.
4. Staff: Wake Lock + vibration on new call/order; uses event-driven SSE (no change in component API beyond the payload shape); lite mode hides order columns on waiter; dark theme header contrast fixed (new `--nav` tokens).
5. Legal pages (es/en text, link in guest footer and login).
6. `ToastProvider` mounted in `src/app/layout.tsx`.

**C. Admin and super admin UI** (`src/components/admin/**`, `src/components/superadmin/**`, `src/app/(dashboard)/admin/**`, `src/app/superadmin/**`, `src/app/(auth)/**`, `src/components/ui/**` except toast.tsx, `messages/{pt,es,en}.json` keys under `admin`, `superadmin`, `auth`, `settings`, `errors`)
1. Menu manager on JSON maps: one input per enabled locale (default locale required), allergen checklist with icons, photo upload, availability toggle; CSV import dialog (URL or file) calling `POST /api/admin/menu/import` with a result summary.
2. Settings: languages (checkbox set + default), ordering on/off, timezone select, currency, Google reviews.
3. "Today" page as admin landing (`/admin` → `/admin/today`): live strip (pending orders, open calls, occupied tables), today's totals with delta vs. same weekday last week, orders per hour chart, top items. Reuses `/api/admin/metrics/*` (real-time, summary, orders/hourly, products/top).
4. Toasts on every save/delete; delete confirmations as in-app dialogs instead of `confirm()`.
5. Superadmin: restaurant creation form includes default locale, enabled locales, currency, timezone.

### Phase 2: integration (after phase 1)
- Translations agent: add `messages/de.json`, `messages/nl.json`, `messages/fr.json` with full parity, and `pt/es/en` parity check.
- QA agent: full E2E (guest in each enabled locale, lite mode on/off, allergen filter, CSV import, staff alerts, today page, migrations from a fresh DB, Docker build).
- Fix round for anything found.

### Phase 3: delivery
- `npm run test`, `npm run test:smoke`, `tsc`, `next build`, Docker image builds and serves `/api/health`.
- PR `feat/production` → `fix/audit` with the deploy guide.

## Out of scope (next milestones)
Payments and tips, POS/printer integration, Verifactu, item modifiers, web push, multi-instance realtime, reservations.
