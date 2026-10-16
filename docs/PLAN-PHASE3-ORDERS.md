# Implementation Plan - Phase 3: Order System

> **Status:** ✅ 100% IMPLEMENTED  
> **Completion date:** 2026-01-07  
> **Next phase:** See [PLAN-PHASE4-KITCHEN.md](./PLAN-PHASE4-KITCHEN.md)

---

## Overview

Let customers place orders directly from their phones, without having to call the waiter.

## User Flow

```
Customer scans QR
    -> Sees menu
    -> Adds items to cart
    -> Reviews order
    -> Submits order
    -> Waiter receives it in real time (SSE)
    -> Waiter confirms
    -> (Phase 4: Kitchen prepares)
    -> Waiter delivers
    -> Customer can see status
```

---

## 1. Database Changes (Prisma)

### New Enums

```prisma
enum OrderStatus {
  PENDING      // Waiting for waiter confirmation
  CONFIRMED    // Waiter confirmed, sent to preparation
  PREPARING    // Kitchen is preparing (Phase 4)
  READY        // Ready for delivery (Phase 4)
  DELIVERED    // Delivered to customer
  CANCELLED    // Cancelled
}
```

### New Models

```prisma
model Order {
  id          String      @id @default(cuid())
  table_id    String
  status      OrderStatus @default(PENDING)
  total       Decimal     @db.Decimal(10, 2)
  notes       String?     // General order notes
  created_at  DateTime    @default(now())
  updated_at  DateTime    @updatedAt
  confirmed_at DateTime?  // When the waiter confirmed
  delivered_at DateTime?  // When it was delivered
  confirmed_by String?    // ID of the waiter who confirmed

  table     Table       @relation(fields: [table_id], references: [id], onDelete: Cascade)
  confirmer User?       @relation("ConfirmedBy", fields: [confirmed_by], references: [id])
  items     OrderItem[]

  @@index([table_id])
  @@index([status])
  @@index([created_at])
}

model OrderItem {
  id           String  @id @default(cuid())
  order_id     String
  menu_item_id String
  quantity     Int
  unit_price   Decimal @db.Decimal(10, 2) // Price at the time of the order
  notes        String? // E.g.: "no onion", "well done"

  order    Order    @relation(fields: [order_id], references: [id], onDelete: Cascade)
  menuItem MenuItem @relation(fields: [menu_item_id], references: [id])

  @@index([order_id])
}
```

### Changes to Existing Models

```prisma
// Add to MenuItem
model MenuItem {
  // ... existing fields ...
  orderItems OrderItem[] // New relation
}

// Add to Table
model Table {
  // ... existing fields ...
  orders Order[] // New relation
}

// Add to User
model User {
  // ... existing fields ...
  confirmed_orders Order[] @relation("ConfirmedBy") // New relation
}
```

---

## 2. Required APIs

### 2.1 POST /api/orders
**Public** - Customer creates an order

Request:
```json
{
  "tableId": "cuid",
  "items": [
    { "menuItemId": "cuid", "quantity": 2, "notes": "no onion" }
  ],
  "notes": "I am allergic to peanuts"
}
```

Response:
```json
{
  "id": "cuid",
  "status": "PENDING",
  "total": 89.90,
  "items": [...],
  "created_at": "..."
}
```

Validations:
- Table exists and is active
- All items exist and are active
- Quantity > 0
- Rate limit per table (1 order every 10s)

### 2.2 GET /api/orders?tableId=xxx
**Public** - Customer sees their table's orders

Response:
```json
[
  {
    "id": "cuid",
    "status": "CONFIRMED",
    "total": 89.90,
    "items": [
      {
        "id": "cuid",
        "quantity": 2,
        "unit_price": 29.90,
        "notes": "no onion",
        "menuItem": {
          "name_pt": "Hamburger",
          "image_url": "..."
        }
      }
    ],
    "created_at": "..."
  }
]
```

### 2.3 GET /api/orders/stream
**Authenticated (Waiter)** - SSE for real-time orders

Returns orders with status PENDING or CONFIRMED in real time.

### 2.4 PATCH /api/orders/[id]/confirm
**Authenticated (Waiter)** - Confirms an order

Response:
```json
{
  "id": "cuid",
  "status": "CONFIRMED",
  "confirmed_at": "...",
  "confirmed_by": "waiter-id"
}
```

### 2.5 PATCH /api/orders/[id]/deliver
**Authenticated (Waiter)** - Marks as delivered

### 2.6 PATCH /api/orders/[id]/cancel
**Authenticated (Waiter/Admin)** - Cancels an order

---

## 3. Customer Components

### 3.1 CartContext (New)
Global context to manage the cart.

```typescript
interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  notes?: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: MenuItem, quantity?: number, notes?: string) => void;
  removeItem: (menuItemId: string) => void;
  updateQuantity: (menuItemId: string, quantity: number) => void;
  updateNotes: (menuItemId: string, notes: string) => void;
  clearCart: () => void;
  total: number;
  itemCount: number;
}
```

### 3.2 MenuView (Modify)
Add a "+" button on each item to add it to the cart.

Changes:
- Receive `tableId` as a prop
- "Add" button on each item
- Badge with the quantity in the header
- Floating "View Cart" button when there are items

### 3.3 CartModal (New)
Modal to review and submit the order.

Features:
- List of items with editable quantity
- Notes field per item
- General notes field
- Order total
- "Submit Order" button
- Success/error feedback

### 3.4 OrderStatusView (New)
Screen for the customer to follow the status of their orders.

Features:
- List of the table's orders
- Visual status (colors/icons)
- Timer since creation
- "Place new order" button

### 3.5 ClientTablePage (Modify)
Add a "My Orders" button and integrate the cart.

---

## 4. Waiter Components

### 4.1 OrdersPanel (New)
Real-time orders panel (similar to WaiterDashboard).

Features:
- List of PENDING and CONFIRMED orders
- Sorted by time (oldest first)
- Timer per order
- Urgency colors
- "Confirm" button (PENDING -> CONFIRMED)
- "Delivered" button (CONFIRMED -> DELIVERED)
- Expand to see items
- Notification sound for new orders

### 4.2 WaiterDashboard (Modify)
Add tabs or a section for orders.

Options:
A) Tabs: "Calls" | "Orders"
B) Unified screen with two sections
C) Side menu to switch

Recommendation: Simple tabs

---

## 5. Status Flow

```
PENDING (Customer submitted)
    |
    v
CONFIRMED (Waiter confirmed)
    |
    v
DELIVERED (Waiter delivered)

At any time before DELIVERED:
    -> CANCELLED (Waiter/Admin cancelled)
```

Note: PREPARING and READY will be used in Phase 4 (Kitchen)

---

## 6. Implementation Order

### Step 1: Backend Base
1. [x] Update schema.prisma with the new models
2. [x] Run prisma db push
3. [x] Create POST /api/orders
4. [x] Create GET /api/orders?tableId=xxx

### Step 2: Customer - Cart
5. [x] Create CartContext
6. [x] Modify MenuView to add items
7. [x] Create CartModal
8. [x] Integrate the cart into ClientTablePage

### Step 3: Customer - Tracking
9. [x] Create OrderStatusView
10. [x] Add "My Orders" button to ClientTablePage

### Step 4: Waiter - Real Time
11. [x] Create GET /api/orders/stream (SSE)
12. [x] Create PATCH /api/orders/[id]/confirm
13. [x] Create PATCH /api/orders/[id]/deliver
14. [x] Create PATCH /api/orders/[id]/cancel

### Step 5: Waiter - Interface
15. [x] Create OrdersPanel
16. [x] Add tabs to WaiterDashboard
17. [x] Notification sound

### Step 6: Translations and Polish
18. [x] Add PT/ES/EN translations
19. [x] Test the full flow
20. [x] UX adjustments

---

## 7. Technical Considerations

### Rate Limiting
- Customer: 1 order every 10 seconds per table
- Prevent order spam

### Validation
- Check that the table is active
- Check that items are active and available
- Check quantity > 0
- Calculate the total on the backend (do not trust the client)

### Security
- Orders are public (no auth), identified by table
- Confirmation/delivery require auth (waiter)
- Cancellation requires auth (waiter/admin)

### Performance
- SSE with 2s polling (same as calls)
- Database indexes for frequent queries
- Pagination for order history

---

## 8. File Structure

```
src/
├── app/
│   └── api/
│       └── orders/
│           ├── route.ts              # GET (list) and POST (create)
│           ├── stream/
│           │   └── route.ts          # Real-time SSE
│           └── [id]/
│               ├── route.ts          # GET a specific order
│               ├── confirm/
│               │   └── route.ts      # PATCH confirm
│               ├── deliver/
│               │   └── route.ts      # PATCH deliver
│               └── cancel/
│                   └── route.ts      # PATCH cancel
├── components/
│   ├── client/
│   │   ├── cart-context.tsx          # Cart context
│   │   ├── cart-modal.tsx            # Cart modal
│   │   ├── menu-view.tsx             # (modify)
│   │   ├── order-status-view.tsx     # Order status
│   │   └── client-table-page.tsx     # (modify)
│   └── waiter/
│       ├── orders-panel.tsx          # Orders panel
│       └── waiter-dashboard.tsx      # (modify)
└── messages/
    ├── pt.json                       # (add translations)
    ├── es.json                       # (add translations)
    └── en.json                       # (add translations)
```

---

## 9. Metrics (Future)

After implementing, add metrics:
- Total orders per period
- Average confirmation time
- Average delivery time
- Most ordered items
- Average ticket
- Cancellation rate

---

## 10. Design Decisions

### Why PENDING -> CONFIRMED -> DELIVERED?

1. **PENDING**: The customer submitted, but the waiter has not seen it yet. There may be an error or a wrong table.

2. **CONFIRMED**: The waiter validated that the order makes sense. It now goes to preparation.

3. **DELIVERED**: The waiter took it to the table. Cycle complete.

### Why is there no "Add to existing order"?

Simplicity. The customer can place several orders. In Phase 4, we can group them by table in the kitchen.

### Why store unit_price on OrderItem?

The item's price may change later. We keep the price at the time of the order for correct history.

---

## Approval

This plan covers all aspects of Phase 3.
After approval, we will start with Step 1 (Backend Base).
