# aiFood

aiFood is a QR-based service platform for cafes and restaurants. Guests scan the code on their table, browse the menu (with allergens), order, call the waiter and ask for the bill, with no account and no app. Staff work from real-time screens. Built to be sold standalone or bundled with a restaurant website.

## What it does

| Who | Where | What they do |
|-----|-------|--------------|
| Guest (no login) | `/table/[token]` (QR code on the table) | Browse the menu in the restaurant's languages, see allergen icons and filter them out, order, track order status, call the waiter, request the bill, rate the service |
| Waiter | `/waiter` | Live calls and orders (SSE): resolve calls, confirm, cancel and deliver orders. Sound, vibration and screen wake lock on new items |
| Kitchen | `/kitchen` | Kanban of confirmed, preparing and ready orders: start preparing, mark ready |
| Admin / Manager | `/admin` (lands on `/admin/today`) | Today page (live strip, totals vs same weekday last week, orders per hour, top items), tables and QR codes, users, menu manager with CSV import, metrics, feedbacks, settings |
| Super admin | `/superadmin` | Create and manage restaurants (multi-tenant), plus their users, tables, menu, feedbacks, operations and metrics |

Order flow: `PENDING` (guest) -> `CONFIRMED` (waiter) -> `PREPARING` -> `READY` (kitchen) -> `DELIVERED` (waiter); `CANCELLED` is possible along the way. After a bill request is resolved the guest rates the service: high scores are sent to Google Reviews, low scores become private feedback.

### Per-restaurant settings (Admin > Settings)

- **Languages**: choose from `es`, `en`, `pt`, `de`, `nl`, `fr`, plus a default (fallback) language. Guests only see the enabled ones. Menu content is stored per language.
- **Lite mode** (`ordering_enabled` off): guests get menu, call waiter and request bill only; ordering endpoints return 403 and staff screens hide order columns.
- **Currency**: `EUR`, `BRL`, `USD`, `GBP`.
- **Timezone** (IANA name): metrics bucket days and hours in this zone.
- **Google Reviews**: link, on/off, minimum stars that redirect to it.

UI translation files exist for `en`, `es` and `pt`. `de`, `nl` and `fr` are accepted as menu languages, but their UI strings fall back to English until `messages/de.json`, `nl.json` and `fr.json` are added.

## Tech stack

- Next.js 14 (App Router), React 18, TypeScript
- PostgreSQL with Prisma 5 (migrations in `prisma/migrations`)
- NextAuth.js v5 (credentials, JWT), login throttling (5 failed attempts per email per 15 min)
- Tailwind CSS 3, Lucide icons, Recharts, dnd-kit
- next-intl for UI translations
- Zod for validation
- Server-Sent Events fed by an in-process event bus (single instance)
- Menu photos on local disk (`UPLOAD_DIR`, default `./uploads`) or Cloudinary when its keys are set, `qrcode` for table QR codes
- `node --test` with tsx for tests

## Local setup

Requirements: Node.js and a running PostgreSQL.

```bash
createdb aifood                  # or create the database any other way
cp .env.example .env             # then edit it (see below)
npm install                      # also runs prisma generate
npm run db:migrate               # prisma migrate deploy (use db:migrate:dev while changing the schema)
npm run db:seed                  # demo restaurant, users, tables, menu
npm run dev                      # http://localhost:3000
```

Minimum `.env` values: `DATABASE_URL`, `AUTH_SECRET` (`openssl rand -base64 32`), `NEXT_PUBLIC_APP_URL` (`http://localhost:3000`). Photo uploads work without any extra account: files go to `./uploads` (set the `CLOUDINARY_*` keys to use Cloudinary instead). Every variable is documented in `.env.example`.

Other scripts: `npm run build`, `npm run start`, `npm run lint`, `npm run db:studio`, `npm run db:generate`.

## Demo data

`npm run db:seed` is idempotent and creates the restaurant **Café del Puerto** (slug `aifood`, languages `es` + `en`, default `es`, EUR, `Europe/Madrid`, ordering on), 8 tables (`Table 1` to `Table 8`), a Spanish/English menu with allergens, and these users:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@aifood.com | admin123 |
| Super Admin | superadmin@aifood.com | superadmin123 |
| Waiter | waiter@aifood.com | waiter123 |
| Kitchen | kitchen@aifood.com | kitchen123 |

Development only. Never seed a production database; use `create-admin` instead.

**Open a table page:** the seed prints `Guest page for Table 1: /table/<token>` at the end. Otherwise log in as the admin, open `/admin/tables`, and use the QR / link of any table. Tokens are random per table, so there is no fixed URL.

## Tests

```bash
npm run test                                       # unit tests (scripts/test/*.test.ts)
BASE_URL=http://localhost:3000 npm run test:smoke  # API contract against a running, seeded server
```

The smoke test defaults to `http://localhost:3010` when `BASE_URL` is unset. It creates its own table and removes it at the end.

## Production

Runs as one long-running Node process (Docker image) plus Postgres, on Railway or Fly. Serverless hosts such as Vercel do not fit the realtime design (fine for previews only). Keep a single instance.

- Step-by-step guide, env vars, Railway and Fly setup: [docs/DEPLOY.md](docs/DEPLOY.md).
- Docker: `docker build --build-arg NEXT_PUBLIC_APP_URL=https://your-domain -t aifood .`. The container runs `prisma migrate deploy` and then the standalone server on `$PORT` (default 3000).
- First admin: `ADMIN_PASSWORD='...' npm run create-admin -- --restaurant "Café Sol" --slug cafe-sol --email owner@cafesol.es` (add `--role SUPER_ADMIN` for the studio account; an existing slug aborts unless `--attach`). In the image: `node scripts/create-admin.ts ...`. See `docs/DEPLOY.md`.
- Health check: `GET /api/health` returns `{"status":"ok","db":"up"}` (503 if the database is down).
- `NEXT_PUBLIC_*` variables are baked in at build time, so pass them as build args.

## Project structure

```
prisma/            schema.prisma, migrations/, seed.ts
messages/          UI translations (en, es, pt)
public/            logos, sounds, menu-template.csv (CSV import template)
scripts/           create-admin.ts, smoke.test.ts, test/ (unit tests)
src/
  app/
    (auth)/        login
    (dashboard)/   admin/*, waiter, kitchen
    (public)/      table/[token] (guest page)
    superadmin/    multi-restaurant panel
    privacy, cookies   legal pages
    api/           REST + SSE routes
  components/      admin, client, kitchen, waiter, superadmin, providers, ui
  lib/             auth, db, i18n, allergens, csv, events (SSE bus), metrics, settings
  middleware.ts    route protection and role redirects
docs/              product, plans and status docs
Dockerfile         multi-stage standalone image
```

## Documentation

- [docs/DEPLOY.md](docs/DEPLOY.md): deploy guide (Railway, Fly, Docker)
- [docs/PLAN-PRODUCTION.md](docs/PLAN-PRODUCTION.md): production milestone decisions and the final API contract
- [docs/STATUS-REVIEW.md](docs/STATUS-REVIEW.md): current routes, roles, files and API
- [docs/brain.md](docs/brain.md): product vision and principles
- [docs/mvp.md](docs/mvp.md): development plan and progress
- [docs/PLAN-PHASE3-ORDERS.md](docs/PLAN-PHASE3-ORDERS.md), [PLAN-PHASE4-KITCHEN.md](docs/PLAN-PHASE4-KITCHEN.md), [PLAN-PHASE5-UX.md](docs/PLAN-PHASE5-UX.md), [PLAN-PHASE6-METRICS.md](docs/PLAN-PHASE6-METRICS.md), [SUPERADMIN-PLAN.md](docs/SUPERADMIN-PLAN.md): historical phase plans (written before the production milestone; the API contract in PLAN-PRODUCTION.md supersedes them)
