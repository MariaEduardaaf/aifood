# aiFood

aiFood is a restaurant operations platform. Customers scan a QR code on their table to call a waiter, ask for the bill, browse the menu and place orders, without creating an account. Staff handle everything in real time from role-specific panels.

## Roles and main flows

| Role | Access | What they do |
|------|--------|--------------|
| Customer (no login) | `/table/[token]` via the table QR code | Call a waiter, request the bill, browse the trilingual menu, order, track order status, rate the service |
| Waiter | `/waiter` | Resolve calls, confirm/cancel/deliver orders (live via SSE) |
| Kitchen | `/kitchen` | Kanban of confirmed, preparing and ready orders; start preparing, mark ready |
| Admin / Manager | `/admin` | Manage tables (with QR codes), users, menu, settings, feedbacks and metrics |
| Super Admin | `/superadmin` | Manage restaurants (multi-tenant), plus their users, tables, menu, operations and metrics |

Order flow: `PENDING` (customer) → `CONFIRMED` (waiter) → `PREPARING` → `READY` (kitchen) → `DELIVERED` (waiter), with `CANCELLED` possible at any point. After a bill request is resolved, the customer rates the service: high scores redirect to Google Reviews, low scores become private feedback.

## Tech stack

- Next.js 14 (App Router), React 18, TypeScript
- PostgreSQL with Prisma 5
- NextAuth.js v5 (credentials, JWT)
- Tailwind CSS 3, Lucide icons, Recharts, dnd-kit
- next-intl (Portuguese, Spanish, English)
- Zod for validation
- Server-Sent Events for real time
- Cloudinary for image uploads
- `qrcode` for table QR codes

## Local setup

Requirements: Node.js and a running PostgreSQL instance.

1. Create an empty PostgreSQL database (for example `visionary`).
2. Copy the environment file and fill it in:

   ```bash
   cp .env.example .env
   ```

   | Variable | Purpose |
   |----------|---------|
   | `DATABASE_URL` | PostgreSQL connection string |
   | `AUTH_SECRET` | NextAuth secret, generate with `openssl rand -base64 32` |
   | `NEXT_PUBLIC_APP_URL` | Public base URL, used in table QR codes (`http://localhost:3000` locally) |
   | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Cloudinary credentials, only needed for menu image uploads |

3. Install, create the schema, seed and run:

   ```bash
   npm install
   npx prisma generate
   npx prisma db push
   npm run db:seed
   npm run dev
   ```

The app runs at http://localhost:3000. Open `/login` to sign in.

Other scripts: `npm run build`, `npm run start`, `npm run lint`, `npm run db:studio` (Prisma Studio), `npm run db:migrate`.

## Demo logins

Created by `npm run db:seed` (development only, change them anywhere else):

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@aifood.com | admin123 |
| Super Admin | superadmin@aifood.com | superadmin123 |
| Waiter | waiter@aifood.com | waiter123 |
| Kitchen | kitchen@aifood.com | kitchen123 |

The seed also creates a demo restaurant, tables, default settings and menu categories. Open a table's QR link from `/admin/tables` to see the customer view.

## Project structure

```
prisma/            schema.prisma and seed.ts
messages/          translations (en.json, es.json, pt.json)
src/
├── app/
│   ├── (auth)/        login
│   ├── (dashboard)/   admin, waiter, kitchen
│   ├── (public)/      table/[token] (customer page)
│   ├── superadmin/    multi-restaurant panel
│   └── api/           REST routes (orders, calls, tables, menu, ...)
├── components/        admin, client, kitchen, waiter, superadmin, ui
├── lib/               auth, db, i18n
├── services/
└── middleware.ts      route protection
docs/              product and implementation docs
```

## Documentation

See [`docs/`](docs/):

- [brain.md](docs/brain.md): product vision and principles
- [mvp.md](docs/mvp.md): development plan and progress
- [PLAN-PHASE3-ORDERS.md](docs/PLAN-PHASE3-ORDERS.md)
- [PLAN-PHASE4-KITCHEN.md](docs/PLAN-PHASE4-KITCHEN.md)
- [PLAN-PHASE5-UX.md](docs/PLAN-PHASE5-UX.md)
- [PLAN-PHASE6-METRICS.md](docs/PLAN-PHASE6-METRICS.md)
- [SUPERADMIN-PLAN.md](docs/SUPERADMIN-PLAN.md)
- [STATUS-REVIEW.md](docs/STATUS-REVIEW.md): current code status and deploy checklist
