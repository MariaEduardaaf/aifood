# Implementation Plan - Phase 4: Kitchen Panel

> **Status:** ✅ 100% IMPLEMENTED  
> **Completion date:** 2026-01-08  
> **Next phase:** Production deploy

## Overview

Let the kitchen see confirmed orders and update the preparation status in real time.

## Full Flow (with Kitchen)

```
Customer places order (PENDING)
    ↓
Waiter confirms (CONFIRMED) ← Already implemented
    ↓
Kitchen sees order (CONFIRMED)
    ↓
Kitchen starts preparing (PREPARING) ← Phase 4
    ↓
Kitchen finishes (READY) ← Phase 4
    ↓
Waiter is notified
    ↓
Waiter delivers (DELIVERED) ← Already implemented
```

---

## 1. Database Changes (Prisma)

### Add KITCHEN Role

```prisma
enum Role {
  WAITER
  ADMIN
  MANAGER
  KITCHEN  // NEW
}
```

### Add fields to Order (optional)

```prisma
model Order {
  // ... existing fields ...
  
  // New fields for kitchen tracking
  preparing_at   DateTime?  // When preparation started
  ready_at       DateTime?  // When it became ready
  prepared_by    String?    // ID of the cook
  
  preparer User? @relation("PreparedBy", fields: [prepared_by], references: [id])
}
```

### Add relation to User

```prisma
model User {
  // ... existing fields ...
  prepared_orders Order[] @relation("PreparedBy")  // NEW
}
```

---

## 2. Required APIs

### 2.1 PATCH /api/orders/[id]/prepare
**Authenticated (KITCHEN)** - Starts preparing the order

Request: No body needed

Response:
```json
{
  "id": "cuid",
  "status": "PREPARING",
  "preparing_at": "2026-01-08T10:30:00Z",
  "prepared_by": "kitchen-user-id"
}
```

Validations:
- User must have the KITCHEN role
- Order must have status CONFIRMED
- Records the timestamp and who started it

### 2.2 PATCH /api/orders/[id]/ready
**Authenticated (KITCHEN)** - Marks the order as ready

Response:
```json
{
  "id": "cuid",
  "status": "READY",
  "ready_at": "2026-01-08T10:45:00Z"
}
```

Validations:
- User must have the KITCHEN role
- Order must have status PREPARING

### 2.3 GET /api/orders/kitchen/stream
**Authenticated (KITCHEN)** - SSE for kitchen orders

Returns orders with status CONFIRMED, PREPARING or READY in real time.

Difference from the waiter stream:
- Focus on CONFIRMED (new ones to prepare)
- PREPARING (in progress)
- READY (ready for pickup)

---

## 3. Kitchen Components

### 3.1 KitchenPage (New page)

Location: `src/app/(dashboard)/kitchen/page.tsx`

Features:
- Layout similar to the waiter panel
- Header with logo and user info
- Main area with orders

### 3.2 KitchenPanel (New component)

Location: `src/components/kitchen/kitchen-panel.tsx`

Features:
- Three columns/sections:
  - **New** (CONFIRMED) - Orders waiting to start
  - **Preparing** (PREPARING) - Orders in progress
  - **Ready** (READY) - Waiting for pickup by the waiter
- Each card shows:
  - Table number
  - Order items with quantities
  - Time since creation
  - Customer notes
- Actions:
  - "Start" (CONFIRMED → PREPARING)
  - "Ready" (PREPARING → READY)
- Visual timer per order
- Urgency colors (green → yellow → red)
- Notification sound for new orders

### 3.3 KitchenOrderCard (New component)

Location: `src/components/kitchen/kitchen-order-card.tsx`

Props:
```typescript
interface KitchenOrderCardProps {
  order: Order & { items: OrderItem[], table: Table }
  onStart?: () => void      // CONFIRMED → PREPARING
  onReady?: () => void      // PREPARING → READY
}
```

Features:
- Shows table, items, quantities
- Groups identical items
- Highlights notes
- Timer colored by urgency
- Contextual action buttons

---

## 4. Middleware Changes

```typescript
// src/middleware.ts

// Add /kitchen to the protected routes
const kitchenRoutes = ['/kitchen']

// Allow only KITCHEN to access /kitchen
if (kitchenRoutes.some(route => pathname.startsWith(route))) {
  if (token?.role !== 'KITCHEN') {
    return NextResponse.redirect(new URL('/login', request.url))
  }
}
```

---

## 5. Seed Changes

```typescript
// prisma/seed.ts

// Add kitchen user
{
  email: 'kitchen@aifood.com',
  password: await bcrypt.hash('kitchen123', 10),
  name: 'Kitchen',
  role: 'KITCHEN'
}
```

---

## 6. Translations (i18n)

### Add to messages/pt.json
(Portuguese values, written without accents in this doc)
```json
{
  "kitchen": {
    "title": "Painel da Cozinha",
    "newOrders": "Novos Pedidos",
    "preparing": "Preparando",
    "ready": "Prontos",
    "startPreparing": "Iniciar Preparo",
    "markReady": "Marcar Pronto",
    "noOrders": "Nenhum pedido no momento",
    "table": "Mesa",
    "items": "Itens",
    "notes": "Observacoes",
    "waiting": "Aguardando ha",
    "minutes": "minutos"
  }
}
```

### Add to messages/es.json
(Spanish values, written without accents in this doc)
```json
{
  "kitchen": {
    "title": "Panel de Cocina",
    "newOrders": "Nuevos Pedidos",
    "preparing": "Preparando",
    "ready": "Listos",
    "startPreparing": "Iniciar Preparacion",
    "markReady": "Marcar Listo",
    "noOrders": "Sin pedidos en este momento",
    "table": "Mesa",
    "items": "Articulos",
    "notes": "Observaciones",
    "waiting": "Esperando hace",
    "minutes": "minutos"
  }
}
```

### Add to messages/en.json
```json
{
  "kitchen": {
    "title": "Kitchen Panel",
    "newOrders": "New Orders",
    "preparing": "Preparing",
    "ready": "Ready",
    "startPreparing": "Start Preparing",
    "markReady": "Mark Ready",
    "noOrders": "No orders at the moment",
    "table": "Table",
    "items": "Items",
    "notes": "Notes",
    "waiting": "Waiting for",
    "minutes": "minutes"
  }
}
```

---

## 7. Updated Status Flow

```
PENDING (Customer submitted)
    ↓
CONFIRMED (Waiter confirmed)
    ↓ ← Kitchen sees it here
PREPARING (Kitchen started) ← NEW in Phase 4
    ↓
READY (Kitchen finished) ← NEW in Phase 4
    ↓ ← Waiter is notified
DELIVERED (Waiter delivered)

At any time: → CANCELLED
```

---

## 8. Notifications

### For the Kitchen
- Sound when a new order arrives (CONFIRMED)
- Visual alert (badge with counter)

### For the Waiter
- Sound when an order becomes READY
- Highlight in the order list
- Badge indicating "Ready for pickup"

---

## 9. Implementation Order

### Step 1: Backend
1. [x] Add `KITCHEN` to the Role enum in schema.prisma
2. [x] Add fields `preparing_at`, `ready_at`, `prepared_by` to Order
3. [x] Add `PreparedBy` relation to User
4. [x] Run `prisma db push`
5. [x] Create API `PATCH /api/orders/[id]/prepare`
6. [x] Create API `PATCH /api/orders/[id]/ready`
7. [x] Create/modify `GET /api/orders/stream` to filter by role

### Step 2: Middleware and Auth
8. [x] Update middleware for the `/kitchen` route
9. [x] Update seed with a KITCHEN user
10. [x] Run the seed again

### Step 3: Kitchen Interface
11. [x] Create the `/kitchen` page
12. [x] Create the `KitchenPanel` component
13. [x] Create the `KitchenOrderCard` component (integrated into KitchenPanel)
14. [x] Implement SSE for real time
15. [x] Add notification sound

### Step 4: Waiter Notifications
16. [x] Modify `OrdersPanel` to highlight READY orders
17. [x] Add sound when an order becomes READY
18. [x] Add badge/visual indicator

### Step 5: Translations and Adjustments
19. [x] Add PT/ES/EN translations
20. [x] Test the full flow (TypeScript OK)
21. [x] UX adjustments

---

## 10. File Structure (New)

```
src/
├── app/
│   ├── (dashboard)/
│   │   └── kitchen/
│   │       └── page.tsx              # Kitchen page
│   └── api/
│       └── orders/
│           └── [id]/
│               ├── prepare/
│               │   └── route.ts      # PATCH prepare
│               └── ready/
│                   └── route.ts      # PATCH ready
└── components/
    └── kitchen/
        ├── kitchen-panel.tsx         # Main panel
        └── kitchen-order-card.tsx    # Order card
```

---

## 11. Metrics (Add to Admin Dashboard)

After implementing, add metrics:
- Average preparation time (CONFIRMED → READY)
- Orders per period
- Most prepared dishes
- Performance per cook (if multiple)
- Rate of late orders (> X minutes)

---

## 12. UX Considerations

### Kanban Layout
Three columns for clear visualization:
```
┌─────────────┬─────────────┬─────────────┐
│     NEW     │  PREPARING  │    READY    │
│  (yellow)   │  (orange)   │   (green)   │
├─────────────┼─────────────┼─────────────┤
│  Order 5    │  Order 3    │  Order 1    │
│  Table 7    │  Table 2    │  Table 4    │
│  3 items    │  2 items    │  1 item     │
│  [Start]    │  [Ready]    │  Waiting    │
├─────────────┼─────────────┼─────────────┤
│  Order 6    │  Order 4    │  Order 2    │
│  Table 1    │  Table 8    │  Table 3    │
│  ...        │  ...        │  ...        │
└─────────────┴─────────────┴─────────────┘
```

### Urgency Colors
- **Green** (< 5 min): Normal time
- **Yellow** (5-10 min): Attention
- **Red** (> 10 min): Urgent

### Sounds
- New order: Short notification sound
- Configurable: Allow muting/adjusting volume

---

## 13. Test Credentials (After Implementation)

| User | Email | Password | Role |
|---------|-------|-------|------|
| Admin | admin@aifood.com | admin123 | ADMIN |
| Waiter | waiter@aifood.com | waiter123 | WAITER |
| Kitchen | kitchen@aifood.com | kitchen123 | KITCHEN |

---

## 14. Design Decisions

### Why separate PREPARING from READY?

1. **Visibility**: The waiter knows whether to wait or can already go pick it up
2. **Metrics**: Measure preparation time separately
3. **Organization**: The kitchen can have several orders "in progress"

### Why not show READY to the waiter automatically?

Actually, we will show it! The waiter will see READY orders highlighted in their list, letting them pick it up from the kitchen at the right time.

### Why store preparing_at and ready_at?

To calculate:
- Order wait time (created_at → confirmed_at)
- Preparation time (preparing_at → ready_at)
- Total time (created_at → delivered_at)

---

## Approval

This plan covers all aspects of Phase 4.
Implement after the production deploy to validate the current flow first.
