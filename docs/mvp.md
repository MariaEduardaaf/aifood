# aiFood: Development Plan

**Repository:** https://github.com/MariaEduardaaf/aifood  
**Last updated:** 2026-01-20

---

## Overall Progress

| Phase | Status | Description |
|-------|--------|-------------|
| MVP | ✅ 100% | Calls + Waiter + Admin |
| Phase 1.5: Google Reviews | ✅ 100% | Smart rating flow |
| Phase 2: Digital Menu | ✅ 100% | Menu with photos, per-restaurant languages, EU allergens, CSV import |
| Phase 3: Orders | ✅ 100% | Customer places orders |
| Phase 4: Kitchen | ✅ 100% | Preparation panel |
| Production milestone | ✅ Code complete | Lite mode, Prisma migrations, Docker, `/api/health`, tests (see PLAN-PRODUCTION.md) |
| Deploy | ⏳ Pending | Railway or Fly + PostgreSQL, guide in DEPLOY.md |

---

## Tech Stack

| Aspect | Technology |
|--------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Database | PostgreSQL + Prisma v5 |
| Authentication | NextAuth.js v5 (JWT + Credentials) |
| UI/Styling | Tailwind CSS v3 |
| Icons | Lucide React |
| Internationalization | next-intl (PT/ES/EN) |
| Validation | Zod |
| Real time | Server-Sent Events (SSE) |
| Image uploads | Cloudinary |
| QR codes | qrcode library |

---

## MVP Complete ✅

### Delivered Features

**Customer (via QR code)**
- Call waiter / Request the bill
- 30s rate limit
- i18n (PT/ES/EN)
- Premium dark theme
- 100% responsive interface

**Waiter**
- Real-time panel (SSE 2s)
- Timer per call
- Urgency colors
- Notification sound

**Admin**
- Tables CRUD + QR code
- Users CRUD + password generation
- Metrics (SLA, rankings, charts)

### Test Credentials

| User | Email | Password | Role |
|------|-------|----------|------|
| Admin | admin@aifood.com | admin123 | ADMIN |
| Waiter | waiter@aifood.com | waiter123 | WAITER |

### Commands

```bash
npm run dev          # Development
npm run build        # Production build
npm run db:push      # Sync database
npm run db:seed      # Seed data
npm run db:studio    # Prisma Studio
```

---

## Phase 1.5: Smart Google Reviews ✅

> **Status:** 100% Implemented

### Implemented Flow
1. Customer asks for the bill
2. Waiter resolves the call
3. System shows a rating modal: "How was the service?" (1-5 stars)
4. **Score 4-5:** Redirects to the restaurant's Google Reviews
5. **Score 1-3:** Private feedback (saved in the database, does not go to Google)

### Features
- [x] `Rating` model in Prisma
- [x] API POST `/api/review`
- [x] API GET `/api/review?callId=xxx` (check whether already rated)
- [x] Rating modal (`rating-modal.tsx`)
- [x] Google Reviews link configuration per restaurant
- [x] Settings page in the admin (`/admin/settings`)
- [x] Rating metrics on the dashboard

### Implemented Schema
```prisma
model Rating {
  id          String   @id @default(cuid())
  call_id     String   @unique
  stars       Int      // 1-5
  feedback    String?  // comment if low score
  redirected  Boolean  @default(false)
  created_at  DateTime @default(now())
  
  call Call @relation(fields: [call_id], references: [id], onDelete: Cascade)
}

model Settings {
  id                  String  @id @default(cuid())
  google_reviews_url  String?
  min_stars_redirect  Int     @default(4)
  updated_at          DateTime @updatedAt
}
```

---

## Phase 2: Digital Menu ✅

> **Status:** 100% Implemented

### Features
- [x] Categories (Starters, Mains, Drinks, Desserts)
- [x] Items with photo, name, description, price
- [x] Trilingual translation (PT/ES/EN)
- [x] Admin: full category CRUD
- [x] Admin: full item CRUD
- [x] Image upload (Cloudinary)
- [x] Category ordering
- [x] Enable/disable categories and items
- [x] Category filter in the menu view

### Implemented APIs
- `GET /api/menu` - Public menu with categories and items
- `GET/POST /api/categories` - Category CRUD
- `GET/PATCH/DELETE /api/categories/[id]` - Operations by ID
- `GET/POST /api/items` - Item CRUD
- `GET/PATCH/DELETE /api/items/[id]` - Operations by ID
- `POST /api/upload` - Image upload (Cloudinary)

### Implemented Schema
```prisma
model Category {
  id        String   @id @default(cuid())
  name_pt   String
  name_es   String
  name_en   String
  order     Int      @default(0)
  active    Boolean  @default(true)
  
  items MenuItem[]
}

model MenuItem {
  id             String   @id @default(cuid())
  category_id    String
  name_pt        String
  name_es        String
  name_en        String
  description_pt String?
  description_es String?
  description_en String?
  price          Decimal  @db.Decimal(10, 2)
  image_url      String?
  active         Boolean  @default(true)
  
  category   Category    @relation(fields: [category_id], references: [id], onDelete: Cascade)
  orderItems OrderItem[]
}
```

---

## Phase 3: Ordering from the App ✅

> **Status:** 100% Implemented

### Features
- [x] Customer adds items to the cart
- [x] Cart with Context API (`cart-context.tsx`)
- [x] Cart modal with summary (`cart-modal.tsx`)
- [x] Notes per item and per order
- [x] Submit order (10s rate limit)
- [x] Waiter receives the order in real time (SSE)
- [x] Tabs in the waiter panel (Calls | Orders)
- [x] Order status (PENDING → CONFIRMED → DELIVERED)
- [x] Customer tracks status in real time
- [x] Order history per table
- [x] Cancel order

### Implemented APIs
- `GET /api/orders?tableId=xxx` - List the table's orders
- `POST /api/orders` - Create order (10s rate limit)
- `GET /api/orders/stream` - Real-time SSE
- `PATCH /api/orders/[id]/confirm` - Waiter confirms
- `PATCH /api/orders/[id]/deliver` - Waiter delivers
- `PATCH /api/orders/[id]/cancel` - Cancel order

### Status Flow
```
PENDING (Customer submitted)
    ↓
CONFIRMED (Waiter confirmed)
    ↓
PREPARING (Kitchen preparing - Phase 4)
    ↓
READY (Ready for delivery - Phase 4)
    ↓
DELIVERED (Delivered to the customer)

At any time: → CANCELLED
```

### Implemented Schema
```prisma
enum OrderStatus {
  PENDING
  CONFIRMED
  PREPARING
  READY
  DELIVERED
  CANCELLED
}

model Order {
  id           String      @id @default(cuid())
  table_id     String
  status       OrderStatus @default(PENDING)
  total        Decimal     @db.Decimal(10, 2)
  notes        String?
  created_at   DateTime    @default(now())
  updated_at   DateTime    @updatedAt
  confirmed_at DateTime?
  delivered_at DateTime?
  confirmed_by String?

  table     Table       @relation(fields: [table_id], references: [id], onDelete: Cascade)
  confirmer User?       @relation("ConfirmedBy", fields: [confirmed_by], references: [id])
  items     OrderItem[]
}

model OrderItem {
  id           String  @id @default(cuid())
  order_id     String
  menu_item_id String
  quantity     Int
  unit_price   Decimal @db.Decimal(10, 2)
  notes        String?

  order    Order    @relation(fields: [order_id], references: [id], onDelete: Cascade)
  menuItem MenuItem @relation(fields: [menu_item_id], references: [id])
}
```

---

## Deploy

See `docs/DEPLOY.md`: the app runs as a Docker image on a long-running Node host (Railway or Fly), with Prisma migrations applied on start and a health check at `/api/health`.

---

## Phase 4: Kitchen Panel ✅

> **Status:** 100% Implemented

### Goal
The kitchen sees the preparation queue and updates order statuses.

### Implemented Features
- [x] `KITCHEN` role added to the enum
- [x] `/kitchen` page created
- [x] `KitchenPanel` component with Kanban layout
- [x] View CONFIRMED, PREPARING and READY orders
- [x] "Start preparing" button → status PREPARING
- [x] "Ready" button → status READY → notifies the waiter
- [x] Sorted by waiting time (oldest first)
- [x] Sound for new orders
- [x] Urgency colors (green → yellow → red)
- [x] PT/ES/EN translations

### Complete Flow (with Kitchen)
```
Customer places an order (PENDING)
    ↓
Waiter confirms (CONFIRMED)
    ↓
Kitchen starts preparing (PREPARING)
    ↓
Kitchen finishes (READY)
    ↓
Waiter delivers (DELIVERED)
```

### Required Changes

None. Implementation complete.

---

## File Structure

```
src/
├── app/
│   ├── (auth)/login/
│   ├── (dashboard)/
│   │   ├── admin/
│   │   │   ├── menu/
│   │   │   ├── settings/
│   │   │   ├── tables/
│   │   │   ├── metrics/
│   │   │   └── users/
│   │   ├── kitchen/
│   │   └── waiter/
│   ├── (public)/table/[token]/
│   └── api/
│       ├── auth/
│       ├── calls/
│       ├── categories/
│       ├── items/
│       ├── menu/
│       ├── metrics/
│       ├── orders/
│       ├── review/
│       ├── settings/
│       ├── tables/
│       ├── upload/
│       └── users/
├── components/
│   ├── admin/
│   ├── client/
│   ├── kitchen/
│   ├── waiter/
│   └── ui/
├── lib/
│   ├── auth/
│   ├── db/
│   └── i18n/
└── middleware.ts
messages/ (pt.json, es.json, en.json)
```

---

## Success Metrics

| Phase | Metric | Target |
|-------|--------|--------|
| MVP | Average service time | < 3min |
| Google Reviews | Increase in positive reviews | +20% |
| Menu | Customers who view it | 80% |
| Orders | Orders placed via the app | 50% |
| Kitchen | Preparation time tracked | 100% |

---

## Next Steps

### Priority 1: Deploy
- Set up the cloud database
- Deploy to Vercel
- Test in a production environment

### Priority 2: Improvements
- Redis for rate limiting in production
- WebSockets for better performance
- Push notifications
- Advanced reports
- Multi-restaurant
