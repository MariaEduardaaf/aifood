# Application Status (Code)

Updated: 2026-10-16 (production milestone, branch `feat/production`)

Source of truth for decisions: [PLAN-PRODUCTION.md](PLAN-PRODUCTION.md). Deploy: [DEPLOY.md](DEPLOY.md).

## Roles and routes

Route protection lives in `src/middleware.ts`. Public: `/`(redirects to `/login`), `/login`, `/table/[token]`, `/privacy`, `/cookies`.

| Role | Home | Notes |
|---|---|---|
| Guest (no login) | `/table/[token]` | Identified only by the table `qr_token` |
| WAITER | `/waiter` | Calls and orders, live |
| KITCHEN | `/kitchen` | CONFIRMED, PREPARING, READY orders |
| ADMIN, MANAGER | `/admin` -> `/admin/today` | Also `/admin/tables`, `/users`, `/metrics`, `/feedbacks`, `/menu`, `/settings` |
| SUPER_ADMIN | `/superadmin` | Also `/superadmin/restaurants`, `/users`, `/tables`, `/menu`, `/feedbacks`, `/operations`, `/metrics`. Staff APIs take `restaurantId` |

Wrong-role visits are redirected to the user's own home. Unauthenticated `/api/*` calls get JSON 401.

## Flows and files

### Guest
- `src/app/(public)/table/[token]/page.tsx`, `src/components/client/` (`client-table-page`, `menu-view`, `cart-modal`, `order-status-view`, `rating-modal`, `language-selector`, `allergen-icon`, `sheet`, `legal-page`).
- Menu with photos, item detail sheet, allergen icons and filter, languages limited to the restaurant's enabled ones, currency from settings. Lite mode hides ordering and "My orders".
- Legal pages: `src/app/privacy`, `src/app/cookies` (es/en template text, needs legal review).

### Waiter and kitchen
- `src/app/(dashboard)/waiter`, `src/components/waiter/`; `src/app/(dashboard)/kitchen`, `src/components/kitchen/`.
- Live via SSE (`src/components/providers/use-event-stream.tsx`), alerts in `staff-alerts.ts` (sound, vibration, wake lock). Lite mode hides order columns on the waiter screen.

### Admin
- `src/app/(dashboard)/admin/*`, `src/components/admin/`: `today-dashboard`, `menu-manager` (one input per enabled language, allergen checklist, photo upload), `menu-import-dialog` (CSV file or Google Sheets URL), `tables-manager`, `users-manager`, `metrics-dashboard` + `metrics/`, `feedbacks-page`, `regional-fields`, `dashboard-nav`.
- Settings page: languages, default language, lite mode, currency, timezone, Google Reviews.

### Super admin
- `src/app/superadmin/*`, `src/components/superadmin/` (`restaurants-manager`, `operations-panel`, `superadmin-nav`).

### Shared libs (`src/lib`)
`allergens.ts` (14 EU codes), `csv.ts` (import parser), `events.ts` (in-process bus), `sse.ts`, `metrics.ts` (timezone-aware), `settings.ts`, `public-table.ts` (qr_token lookup), `i18n/` (`locales.ts`, `text.ts`, `request.ts`), `auth/`, `db/`, `safe-redirect.ts`.

### Data and tooling
- Prisma models: Restaurant, User, Table, Call, Rating, Settings, Category, MenuItem, Order, OrderItem, LoginAttempt. Migrations: `0001_init`, `0002_locales_allergens_lite`.
- Menu text lives in JSON maps per locale (`names`, `descriptions`); `allergens` is `string[]`.
- Scripts: `prisma/seed.ts` (demo data), `scripts/create-admin.ts` (first admin), `scripts/test/*.test.ts` (unit), `scripts/smoke.test.ts` (API).

## Public API contract (guests, by `qr_token`)

Unknown or inactive table: 404 `{ error: "Table not found" }`; inactive restaurant 403; missing `table` 400.

- `GET /api/menu?table=<token>` -> `{ restaurant: { name }, table: { label }, settings: { currency, enabled_locales, default_locale, ordering_enabled }, categories: [{ id, names, items: [{ id, names, descriptions, allergens, price, image_url }] }] }`. `price` is a decimal string; empty categories omitted.
- `GET /api/tables/status?table=<token>` -> `{ label, ordering_enabled, openCalls, pendingRating }`.
- `POST /api/calls` `{ table, type: "CALL_WAITER" | "REQUEST_BILL" }` -> 201; 200 if one is already open; 429 within 30s.
- `POST /api/orders` `{ table, items: [{ menuItemId, quantity 1-50, notes? }] (1-30), notes? }` -> 201; 429 within 10s; 400 `{ error, missingIds }`.
- `GET /api/orders?table=<token>` -> last 24h, not cancelled.
- Lite mode (`ordering_enabled: false`): both order calls return 403 `{ error: "ordering_disabled" }`.
- `POST /api/review`, `GET /api/review?callId=`.
- `GET /api/health` -> `{ status: "ok", db: "up" }` or 503.

## Staff API

All need a session unless noted. Admin routes: ADMIN/MANAGER; SUPER_ADMIN passes `restaurantId`.

| Area | Routes |
|---|---|
| Orders | `GET /api/orders` (staff list, no `table`), `PATCH /api/orders/[id]/{confirm,prepare,ready,deliver,cancel}` |
| Calls | `GET /api/calls`, `PATCH /api/calls/[id]/resolve` |
| Realtime | `GET /api/orders/stream`, `GET /api/calls/stream` |
| Tables | `GET/POST /api/tables`, `GET/PATCH/DELETE /api/tables/[id]`, `GET /api/tables/[id]/qrcode` |
| Menu | `GET/POST /api/categories`, `GET/PUT/DELETE /api/categories/[id]`, `GET/POST /api/items`, `GET/PUT/DELETE /api/items/[id]`, `POST /api/upload`, `POST /api/admin/menu/import` |
| Users | `GET/POST /api/users`, `GET/PATCH/DELETE /api/users/[id]` |
| Settings | `GET/PUT /api/settings` |
| Restaurants | `GET/POST /api/restaurants`, `GET/PATCH/DELETE /api/restaurants/[id]` (SUPER_ADMIN) |
| Metrics | `GET /api/metrics`, `GET /api/admin/metrics/{summary,real-time,categories,orders/hourly,orders/weekday,products/top}`, `GET /api/admin/feedbacks` |
| Auth | `/api/auth/[...nextauth]`; 5 failed logins per email in 15 min -> `code=rate_limited` |

Write rules: `names` max 120 chars per locale, `descriptions` 500; keys must be supported locales; `names` must include the restaurant's default locale; `allergens` must be EU codes. Settings `PUT`: `currency` (EUR|BRL|USD|GBP), `enabled_locales` (1-6), `default_locale` (must be enabled), `ordering_enabled`, `timezone` (IANA), Google Reviews fields.

Menu import: JSON `{ url }` (Google Sheets), JSON `{ csv }` or multipart `file`; max 1MB and 500 rows; response `{ created, updated, errors[] }`. Template: `public/menu-template.csv`.

Metrics periods include `lastweekday` (same weekday last week up to the current time of day). All buckets use `Settings.timezone`.

## Realtime (SSE)

`orders/stream` roles: WAITER, ADMIN, MANAGER, KITCHEN, SUPER_ADMIN (`?restaurantId=`). `calls/stream`: same without KITCHEN.

| Frame | Payload | When |
|---|---|---|
| `event: refresh` | full list of records | on connect and every 30s |
| `event: order` | one order | every create and status change |
| `event: call` | one call | create and resolve (`status: "RESOLVED"` means remove) |
| `: heartbeat` | comment | every 25s; `retry: 3000` on connect |

Clients drop order records whose status is outside their view (kitchen: CONFIRMED/PREPARING/READY; waiter: PENDING/CONFIRMED/READY; everyone drops DELIVERED/CANCELLED). Bus: `emit` / `subscribe` in `src/lib/events.ts`, single instance only.

## Environment variables

See `.env.example` (each variable commented) and the table in [DEPLOY.md](DEPLOY.md). Required: `DATABASE_URL`, `AUTH_SECRET`, `AUTH_TRUST_HOST`. Recommended: `NEXT_PUBLIC_APP_URL`. Optional: `CLOUDINARY_*`, `NEXT_PUBLIC_SHOW_DEMO_LOGINS`.

## Deploy checklist

1. Postgres and a long-running Node host (Railway or Fly), one instance.
2. Set env vars; pass `NEXT_PUBLIC_*` as build args.
3. Deploy the Docker image (runs `prisma migrate deploy` on start); health check `/api/health`.
4. Create the first admin with `create-admin`; do not run the seed in production.
5. `npm run test` and `BASE_URL=... npm run test:smoke` before release.

## Known gaps

- UI translation files exist only for `en`, `es`, `pt`; `de`, `nl`, `fr` fall back to English.
- Realtime is single-instance (in-process bus); scale-out needs Redis or Postgres `LISTEN/NOTIFY`.
- Out of scope for now: payments and tips, POS/printers, Verifactu, item modifiers, web push, reservations.
- Legal pages are template text pending legal review.
