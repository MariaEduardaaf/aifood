# Application Status (Code)

Updated: 2026-01-20

## Flows by role (current state)

### Customer (QR / Table)
- Access: `/table/[token]` validates the table by `qr_token`.
- Actions: call waiter, request the bill, browse the menu, cart and order status.
- Files:
  - `src/app/(public)/table/[token]/page.tsx`
  - `src/components/client/client-table-page.tsx`
  - `src/components/client/menu-view.tsx`
  - `src/components/client/cart-modal.tsx`
  - `src/components/client/order-status-view.tsx`

### Waiter
- Logs in at `/login` and accesses `/waiter`.
- Calls via SSE and resolution.
- Orders via SSE with confirm/cancel/deliver.
- Files:
  - `src/app/(dashboard)/waiter/page.tsx`
  - `src/components/waiter/waiter-page.tsx`
  - `src/components/waiter/waiter-dashboard.tsx`
  - `src/components/waiter/orders-kanban.tsx`

### Kitchen
- Login and access to `/kitchen`.
- Kanban/list of confirmed/preparing/ready orders.
- Actions: start preparing and mark as ready.
- Files:
  - `src/app/(dashboard)/kitchen/page.tsx`
  - `src/components/kitchen/kitchen-page.tsx`
  - `src/components/kitchen/kitchen-kanban.tsx`
  - `src/components/kitchen/kitchen-panel.tsx`

### Admin/Manager
- Login and access to `/admin` (redirects to `/admin/tables`).
- CRUD for tables, users, menu, plus metrics, feedbacks and settings.
- Files:
  - `src/app/(dashboard)/admin/page.tsx`
  - `src/components/admin/dashboard-nav.tsx`
  - `src/components/admin/metrics-dashboard.tsx`

## Deploy/production checklist

### Infrastructure
- PostgreSQL (Neon/Supabase/Railway)
- Vercel
- Cloudinary

### Environment variables
- `DATABASE_URL`
- `AUTH_SECRET`
- `NEXT_PUBLIC_APP_URL`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

### Steps
- `npm run build`
- `npx prisma db push`
- `npm run db:seed` (optional)

## Potential risks/bugs

1) Public routes blocked by the middleware (fixed)
- Adjusted to expose `/api/menu`, `/api/orders` and `/api/review` publicly.
- File: `src/middleware.ts`

2) Waiter fetches `/api/orders` without `tableId` (fixed)
- The endpoint now accepts authenticated use without `tableId` and returns active orders.
- Files:
  - `src/components/waiter/waiter-page.tsx`
  - `src/app/api/orders/route.ts`

3) Loose permissions on order actions (fixed)
- `confirm`, `deliver` and `cancel` now require the waiter/admin/manager role.
- Files:
  - `src/app/api/orders/[id]/confirm/route.ts`
  - `src/app/api/orders/[id]/deliver/route.ts`
  - `src/app/api/orders/[id]/cancel/route.ts`

4) Delivery allowed unexpected statuses (fixed)
- `deliver` now accepts only `READY`.
- File: `src/app/api/orders/[id]/deliver/route.ts`
