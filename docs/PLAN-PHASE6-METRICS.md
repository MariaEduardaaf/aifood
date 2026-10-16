# Implementation Plan - Phase 6: Admin Dashboard with Metrics

> **Status:** Completed  
> **Dependencies:** Phase 5 (UX) completed  
> **Goal:** Provide real-time insights into restaurant performance

---

## Overview

Implement a complete metrics dashboard for the admin panel, allowing managers and administrators to track restaurant KPIs in real time.

---

## 1. Key Metrics (KPIs)

### 1.1 Order Metrics

| Metric | Description | Calculation |
|---------|-----------|---------|
| Total Orders | Number of orders in the period | COUNT(orders) |
| Orders by Status | Distribution by status | GROUP BY status |
| Average Ticket | Average value per order | AVG(total) |
| Total Revenue | Revenue in the period | SUM(total) |
| Orders by Hour | Hourly distribution | GROUP BY HOUR(created_at) |
| Orders by Day of Week | Weekly pattern | GROUP BY DAYOFWEEK(created_at) |

### 1.2 Time Metrics

| Metric | Description | Calculation |
|---------|-----------|---------|
| Average Confirmation Time | Waiter confirming the order | AVG(confirmed_at - created_at) |
| Average Preparation Time | Kitchen preparing | AVG(ready_at - preparing_at) |
| Average Total Time | Order until delivery | AVG(delivered_at - created_at) |
| Preparation SLA | % of orders < 15 min | COUNT(< 15min) / COUNT(*) |
| Late Orders | % of orders > 20 min | COUNT(> 20min) / COUNT(*) |

### 1.3 Product Metrics

| Metric | Description | Calculation |
|---------|-----------|---------|
| Best-Selling Items | Top 10 products | GROUP BY menuItem ORDER BY SUM(quantity) |
| Best-Selling Categories | Performance by category | GROUP BY category |
| Items per Order | Average number of items | AVG(COUNT(order_items)) |
| Revenue per Product | Revenue per item | SUM(quantity * unit_price) |

### 1.4 Table Metrics

| Metric | Description | Calculation |
|---------|-----------|---------|
| Most Active Tables | Table ranking | GROUP BY table ORDER BY COUNT(orders) |
| Occupancy by Time | Usage pattern | Tables with active orders per hour |
| Average Ticket per Table | Average spend per table | AVG(total) GROUP BY table |

### 1.5 Service Metrics

| Metric | Description | Calculation |
|---------|-----------|---------|
| Calls by Type | WAITER vs BILL | GROUP BY call_type |
| Average Service Time | Response to calls | AVG(resolved_at - created_at) |
| Calls per Waiter | Individual performance | GROUP BY resolved_by |
| Resolution Rate | % of calls resolved | COUNT(resolved) / COUNT(*) |

### 1.6 Kitchen Metrics

| Metric | Description | Calculation |
|---------|-----------|---------|
| Orders per Cook | Individual performance | GROUP BY prepared_by |
| Average Time per Cook | Individual efficiency | AVG(ready_at - preparing_at) GROUP BY prepared_by |
| Simultaneous Orders | Peak of orders in preparation | MAX(COUNT(PREPARING)) |

### 1.7 Satisfaction Metrics

| Metric | Description | Calculation |
|---------|-----------|---------|
| Average Rating | Customer reviews | AVG(rating) |
| Rating Distribution | Count per star | GROUP BY rating |
| Review Rate | % of customers who leave a review | COUNT(ratings) / COUNT(orders) |
| NPS (Net Promoter Score) | Promoters vs Detractors | (9-10) - (1-6) / total |

---

## 2. Database Structure

### 2.1 Required Fields (Already Existing)

```prisma
model Order {
  id            String       @id @default(cuid())
  status        OrderStatus
  total         Decimal
  created_at    DateTime     @default(now())
  confirmed_at  DateTime?
  preparing_at  DateTime?
  ready_at      DateTime?
  delivered_at  DateTime?    // NEW - needs to be added
  prepared_by   String?
  // ...
}

model Call {
  id           String    @id @default(cuid())
  call_type    CallType
  status       CallStatus
  created_at   DateTime  @default(now())
  resolved_at  DateTime?
  resolved_by  String?
  // ...
}

model Rating {
  id         String   @id @default(cuid())
  stars      Int
  feedback   String?
  created_at DateTime @default(now())
  // ...
}
```

### 2.2 New Required Field

Add to schema.prisma:

```prisma
model Order {
  // ... existing fields ...
  delivered_at  DateTime?  // When it was delivered to the customer
}
```

---

## 3. Metrics APIs

### 3.1 GET /api/admin/metrics/summary

Returns a general summary for the selected period.

**Query Params:**
- `period`: today | week | month | custom
- `startDate`: ISO date (for custom)
- `endDate`: ISO date (for custom)

**Response:**
```json
{
  "orders": {
    "total": 150,
    "confirmed": 145,
    "cancelled": 5,
    "cancellationRate": 3.33,
    "averageTicket": 89.50,
    "totalRevenue": 13425.00
  },
  "times": {
    "avgConfirmation": 45,
    "avgPreparation": 720,
    "avgTotal": 1200,
    "preparationSla": 92.5,
    "delayedOrdersRate": 7.5
  },
  "calls": {
    "total": 85,
    "waiter": 60,
    "bill": 25,
    "avgServiceTime": 120
  },
  "satisfaction": {
    "averageRating": 4.5,
    "totalReviews": 45,
    "reviewRate": 30
  }
}
```

### 3.2 GET /api/admin/metrics/orders/hourly

Distribution of orders by hour.

**Response:**
```json
{
  "data": [
    { "hour": 11, "quantity": 5, "revenue": 450.00 },
    { "hour": 12, "quantity": 25, "revenue": 2250.00 },
    { "hour": 13, "quantity": 30, "revenue": 2700.00 },
    // ...
  ]
}
```

### 3.3 GET /api/admin/metrics/orders/weekday

Distribution by day of the week.

**Response:**
```json
{
  "data": [
    { "day": 0, "key": "sunday", "quantity": 80, "revenue": 7200.00 },
    { "day": 1, "key": "monday", "quantity": 45, "revenue": 4050.00 },
    // ...
  ]
}
```

### 3.4 GET /api/admin/metrics/products/top

Top best-selling products.

**Query Params:**
- `limit`: number (default: 10)
- `period`: today | week | month

**Response:**
```json
{
  "data": [
    {
      "id": "cuid",
      "name": "Premium Picanha",
      "category": "Meats",
      "quantity": 85,
      "revenue": 7650.00,
      "percentage": 15.2
    },
    // ...
  ]
}
```

### 3.5 GET /api/admin/metrics/categories

Performance by category.

**Response:**
```json
{
  "data": [
    {
      "id": "cuid",
      "name": "Meats",
      "orders": 120,
      "items": 250,
      "revenue": 22500.00,
      "percentage": 45.0
    },
    // ...
  ]
}
```

### 3.6 GET /api/admin/metrics/tables

Metrics per table.

**Response:**
```json
{
  "data": [
    {
      "id": "cuid",
      "label": "Table 5",
      "orders": 25,
      "revenue": 2250.00,
      "averageTicket": 90.00
    },
    // ...
  ]
}
```

### 3.7 GET /api/admin/metrics/team/waiters

Waiter performance.

**Response:**
```json
{
  "data": [
    {
      "id": "cuid",
      "name": "John",
      "callsHandled": 45,
      "avgResponseTime": 95,
      "averageRating": 4.7
    },
    // ...
  ]
}
```

### 3.8 GET /api/admin/metrics/team/cooks

Kitchen performance.

**Response:**
```json
{
  "data": [
    {
      "id": "cuid",
      "name": "Chef Maria",
      "ordersPrepared": 85,
      "avgPreparationTime": 680,
      "slaRate": 95.3
    },
    // ...
  ]
}
```

### 3.9 GET /api/admin/metrics/real-time

Real-time data for the dashboard.

**Response:**
```json
{
  "activeOrders": {
    "pending": 3,
    "confirmed": 5,
    "preparing": 4,
    "ready": 2
  },
  "openCalls": 2,
  "occupiedTables": 12,
  "recentOrders": [
    { "id": "cuid", "table": "Table 5", "total": 89.50, "status": "PREPARING", "createdAt": "2026-01-09T20:41:00.000Z" }
  ],
  "alerts": [
    { "severity": "DELAY", "kind": "ORDER_WAITING", "table": "Table 3", "minutes": 21 }
  ]
}
```

### 3.10 GET /api/admin/metrics/comparison

Comparison between periods.

**Query Params:**
- `currentPeriod`: today | week | month
- `previousPeriod`: yesterday | lastWeek | lastMonth

**Response:**
```json
{
  "current": {
    "orders": 150,
    "revenue": 13425.00,
    "averageTicket": 89.50
  },
  "previous": {
    "orders": 130,
    "revenue": 11050.00,
    "averageTicket": 85.00
  },
  "variation": {
    "orders": 15.38,
    "revenue": 21.49,
    "averageTicket": 5.29
  }
}
```

---

## 4. Dashboard Components

### 4.1 Page Structure

```
src/app/(dashboard)/admin/
├── page.tsx                    # Main dashboard (existing - modify)
├── metrics/
│   ├── page.tsx               # Detailed metrics page
│   ├── orders/
│   │   └── page.tsx           # Detailed order analysis
│   ├── products/
│   │   └── page.tsx           # Product analysis
│   ├── team/
│   │   └── page.tsx           # Team performance
│   └── satisfaction/
│       └── page.tsx           # Satisfaction metrics
```

### 4.2 Metrics Components

```
src/components/admin/metrics/
├── metrics-overview.tsx        # Summary cards (main KPIs)
├── metrics-charts.tsx          # General charts
├── orders-by-hour-chart.tsx    # Orders by hour chart
├── orders-by-day-chart.tsx     # Day of week chart
├── top-products-chart.tsx      # Top products (bar chart)
├── categories-chart.tsx        # Categories (pie/donut chart)
├── time-metrics-card.tsx       # Average times
├── team-performance.tsx        # Team performance
├── real-time-panel.tsx         # Real-time panel
├── comparison-card.tsx         # Period comparison
├── alerts-panel.tsx            # Alerts and notifications
├── date-range-picker.tsx       # Period selector
└── export-button.tsx           # Export data (CSV/PDF)
```

### 4.3 MetricsOverview Component

File: `src/components/admin/metrics/metrics-overview.tsx`

```typescript
interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ComponentType;
  color: "gold" | "green" | "red" | "blue";
}

function MetricCard({ title, value, change, changeLabel, icon: Icon, color }: MetricCardProps) {
  return (
    <div className="card-premium p-6 rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl bg-${color}-500/10`}>
          <Icon className={`h-6 w-6 text-${color}-500`} />
        </div>
        {change !== undefined && (
          <div className={cn(
            "flex items-center gap-1 text-sm font-medium",
            change >= 0 ? "text-green-500" : "text-red-500"
          )}>
            {change >= 0 ? <TrendingUp /> : <TrendingDown />}
            {Math.abs(change)}%
          </div>
        )}
      </div>
      <h3 className="text-2xl font-bold">{value}</h3>
      <p className="text-sm text-muted-foreground">{title}</p>
      {changeLabel && (
        <p className="text-xs text-muted-foreground mt-1">{changeLabel}</p>
      )}
    </div>
  );
}

export function MetricsOverview({ data, period }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard
        title="Total Orders"
        value={data.orders.total}
        change={data.variation?.orders}
        changeLabel="vs previous period"
        icon={ShoppingBag}
        color="gold"
      />
      <MetricCard
        title="Total Revenue"
        value={`R$ ${data.orders.totalRevenue.toLocaleString()}`}
        change={data.variation?.revenue}
        icon={DollarSign}
        color="green"
      />
      <MetricCard
        title="Average Ticket"
        value={`R$ ${data.orders.averageTicket.toFixed(2)}`}
        change={data.variation?.averageTicket}
        icon={Receipt}
        color="blue"
      />
      <MetricCard
        title="Average Rating"
        value={data.satisfaction.averageRating.toFixed(1)}
        icon={Star}
        color="gold"
      />
    </div>
  );
}
```

### 4.4 OrdersByHourChart Component

File: `src/components/admin/metrics/orders-by-hour-chart.tsx`

```typescript
"use client";

import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface OrdersByHourData {
  hour: number;
  quantity: number;
  revenue: number;
}

export function OrdersByHourChart({ data }: { data: OrdersByHourData[] }) {
  const chartData = useMemo(() => {
    // Fill in all hours (0-23)
    const fullData = Array.from({ length: 24 }, (_, i) => {
      const found = data.find((d) => d.hour === i);
      return {
        hour: `${i.toString().padStart(2, "0")}:00`,
        quantity: found?.quantity || 0,
        revenue: found?.revenue || 0,
      };
    });
    return fullData;
  }, [data]);

  return (
    <div className="card-premium p-6 rounded-xl">
      <h3 className="font-semibold mb-4">Orders by Hour</h3>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorQtd" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(38 92% 50%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(38 92% 50%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="hour"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
            />
            <Area
              type="monotone"
              dataKey="quantity"
              stroke="hsl(38 92% 50%)"
              fill="url(#colorQtd)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
```

### 4.5 TopProductsChart Component

File: `src/components/admin/metrics/top-products-chart.tsx`

```typescript
"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface TopProductData {
  name: string;
  quantity: number;
  revenue: number;
}

export function TopProductsChart({ data }: { data: TopProductData[] }) {
  return (
    <div className="card-premium p-6 rounded-xl">
      <h3 className="font-semibold mb-4">Top 10 Products</h3>
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
            <YAxis
              type="category"
              dataKey="name"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              width={120}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
              formatter={(value: number, name: string) => [
                name === "quantity" ? `${value} sold` : `R$ ${value.toFixed(2)}`,
                name === "quantity" ? "Quantity" : "Revenue",
              ]}
            />
            <Bar dataKey="quantity" fill="hsl(38 92% 50%)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
```

### 4.6 CategoriesChart Component

File: `src/components/admin/metrics/categories-chart.tsx`

```typescript
"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

const COLORS = [
  "hsl(38 92% 50%)",   // Gold
  "hsl(142 76% 36%)",  // Green
  "hsl(217 91% 60%)",  // Blue
  "hsl(0 84% 60%)",    // Red
  "hsl(280 65% 60%)",  // Purple
  "hsl(45 93% 47%)",   // Yellow
  "hsl(180 65% 45%)",  // Cyan
  "hsl(320 65% 52%)",  // Pink
];

interface CategoryData {
  name: string;
  revenue: number;
  percentage: number;
}

export function CategoriesChart({ data }: { data: CategoryData[] }) {
  return (
    <div className="card-premium p-6 rounded-xl">
      <h3 className="font-semibold mb-4">Revenue by Category</h3>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="revenue"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={100}
              innerRadius={60}
              paddingAngle={2}
              label={({ name, percentage }) => `${percentage.toFixed(1)}%`}
            >
              {data.map((entry, index) => (
                <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => `R$ ${value.toLocaleString()}`}
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
```

### 4.7 TimeMetricsCard Component

File: `src/components/admin/metrics/time-metrics-card.tsx`

```typescript
"use client";

import { Clock, CheckCircle, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimeMetrics {
  avgConfirmation: number;  // seconds
  avgPreparation: number;      // seconds
  avgTotal: number;        // seconds
  preparationSla: number;        // percentage
  delayedOrders: number;  // percentage
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (minutes < 60) return `${minutes}m ${secs}s`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

export function TimeMetricsCard({ data }: { data: TimeMetrics }) {
  return (
    <div className="card-premium p-6 rounded-xl">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Clock className="h-5 w-5 text-primary" />
        Service Times
      </h3>

      <div className="space-y-4">
        {/* Confirmation time */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Confirmation</span>
          <span className="font-mono font-medium">
            {formatTime(data.avgConfirmation)}
          </span>
        </div>

        {/* Preparation time */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Preparation</span>
          <span className="font-mono font-medium">
            {formatTime(data.avgPreparation)}
          </span>
        </div>

        {/* Total time */}
        <div className="flex items-center justify-between border-t border-border/50 pt-4">
          <span className="text-sm font-medium">Total Time</span>
          <span className="font-mono font-bold text-lg">
            {formatTime(data.avgTotal)}
          </span>
        </div>

        {/* SLA */}
        <div className="mt-4 p-4 rounded-lg bg-secondary/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              SLA (&lt; 15 min)
            </span>
            <span className={cn(
              "font-bold",
              data.preparationSla >= 90 ? "text-green-500" :
              data.preparationSla >= 75 ? "text-yellow-500" : "text-red-500"
            )}>
              {data.preparationSla.toFixed(1)}%
            </span>
          </div>

          <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                data.preparationSla >= 90 ? "bg-green-500" :
                data.preparationSla >= 75 ? "bg-yellow-500" : "bg-red-500"
              )}
              style={{ width: `${data.preparationSla}%` }}
            />
          </div>
        </div>

        {/* Late orders */}
        {data.delayedOrders > 5 && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 text-red-500">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">
              {data.delayedOrders.toFixed(1)}% of orders delayed
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
```

### 4.8 TeamPerformance Component

File: `src/components/admin/metrics/team-performance.tsx`

```typescript
"use client";

import { User, ChefHat, Clock, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface WaiterData {
  id: string;
  name: string;
  callsHandled: number;
  avgResponseTime: number;
  averageRating: number;
}

interface ChefData {
  id: string;
  name: string;
  ordersPrepared: number;
  avgPreparationTime: number;
  slaRate: number;
}

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}m ${secs}s`;
}

export function TeamPerformance({
  waiters,
  cooks,
}: {
  waiters: WaiterData[];
  cooks: ChefData[];
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Waiters */}
      <div className="card-premium p-6 rounded-xl">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          Waiter Performance
        </h3>

        <div className="space-y-3">
          {waiters.map((waiter, index) => (
            <div
              key={waiter.id}
              className="flex items-center justify-between p-3 rounded-lg bg-secondary/30"
            >
              <div className="flex items-center gap-3">
                <span className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                  index === 0 ? "bg-yellow-500 text-yellow-950" :
                  index === 1 ? "bg-gray-400 text-gray-950" :
                  index === 2 ? "bg-amber-600 text-amber-950" :
                  "bg-secondary text-muted-foreground"
                )}>
                  {index + 1}
                </span>
                <span className="font-medium">{waiter.name}</span>
              </div>

              <div className="flex items-center gap-4 text-sm">
                <div className="text-center">
                  <p className="font-bold">{waiter.callsHandled}</p>
                  <p className="text-xs text-muted-foreground">calls</p>
                </div>
                <div className="text-center">
                  <p className="font-bold">{formatTime(waiter.avgResponseTime)}</p>
                  <p className="text-xs text-muted-foreground">avg. time</p>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  <span className="font-bold">{waiter.averageRating.toFixed(1)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cooks */}
      <div className="card-premium p-6 rounded-xl">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <ChefHat className="h-5 w-5 text-primary" />
          Kitchen Performance
        </h3>

        <div className="space-y-3">
          {cooks.map((chef, index) => (
            <div
              key={chef.id}
              className="flex items-center justify-between p-3 rounded-lg bg-secondary/30"
            >
              <div className="flex items-center gap-3">
                <span className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                  index === 0 ? "bg-yellow-500 text-yellow-950" :
                  index === 1 ? "bg-gray-400 text-gray-950" :
                  index === 2 ? "bg-amber-600 text-amber-950" :
                  "bg-secondary text-muted-foreground"
                )}>
                  {index + 1}
                </span>
                <span className="font-medium">{chef.name}</span>
              </div>

              <div className="flex items-center gap-4 text-sm">
                <div className="text-center">
                  <p className="font-bold">{chef.ordersPrepared}</p>
                  <p className="text-xs text-muted-foreground">orders</p>
                </div>
                <div className="text-center">
                  <p className="font-bold">{formatTime(chef.avgPreparationTime)}</p>
                  <p className="text-xs text-muted-foreground">avg. time</p>
                </div>
                <div className={cn(
                  "px-2 py-1 rounded text-xs font-bold",
                  chef.slaRate >= 90 ? "bg-green-500/20 text-green-500" :
                  chef.slaRate >= 75 ? "bg-yellow-500/20 text-yellow-500" :
                  "bg-red-500/20 text-red-500"
                )}>
                  {chef.slaRate.toFixed(0)}% SLA
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

### 4.9 RealTimePanel Component

File: `src/components/admin/metrics/real-time-panel.tsx`

```typescript
"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Activity, AlertTriangle, Clock, Table } from "lucide-react";
import { cn } from "@/lib/utils";

interface RealTimeData {
  activeOrders: {
    pending: number;
    confirmed: number;
    preparing: number;
    ready: number;
  };
  openCalls: number;
  occupiedTables: number;
  alerts: Array<{
    severity: "WARNING" | "DELAY";
    kind: "ORDER_WAITING" | "MANY_OPEN_CALLS";
    table?: string;
    minutes?: number;
    count?: number;
  }>;
}

export function RealTimePanel() {
  const t = useTranslations("admin.metrics");
  const [data, setData] = useState<RealTimeData | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch("/api/admin/metrics/real-time");
      if (res.ok) {
        setData(await res.json());
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000); // Refreshes every 5s

    return () => clearInterval(interval);
  }, []);

  if (!data) return null;

  const totalActiveOrders =
    data.activeOrders.pending +
    data.activeOrders.confirmed +
    data.activeOrders.preparing +
    data.activeOrders.ready;

  return (
    <div className="card-premium p-6 rounded-xl">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Activity className="h-5 w-5 text-green-500 animate-pulse" />
        Real Time
      </h3>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
        <div className="text-center p-3 rounded-lg bg-yellow-500/10">
          <p className="text-2xl font-bold text-yellow-500">
            {data.activeOrders.pending}
          </p>
          <p className="text-xs text-muted-foreground">Pending</p>
        </div>
        <div className="text-center p-3 rounded-lg bg-blue-500/10">
          <p className="text-2xl font-bold text-blue-500">
            {data.activeOrders.confirmed}
          </p>
          <p className="text-xs text-muted-foreground">Confirmed</p>
        </div>
        <div className="text-center p-3 rounded-lg bg-orange-500/10">
          <p className="text-2xl font-bold text-orange-500">
            {data.activeOrders.preparing}
          </p>
          <p className="text-xs text-muted-foreground">Preparing</p>
        </div>
        <div className="text-center p-3 rounded-lg bg-green-500/10">
          <p className="text-2xl font-bold text-green-500">
            {data.activeOrders.ready}
          </p>
          <p className="text-xs text-muted-foreground">Ready</p>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Table className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">
            <strong>{data.occupiedTables}</strong> tables occupied
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">
            <strong>{data.openCalls}</strong> open calls
          </span>
        </div>
      </div>

      {/* Alerts */}
      {data.alerts.length > 0 && (
        <div className="space-y-2">
          {data.alerts.map((alert, index) => (
            <div
              key={index}
              className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 text-red-500"
            >
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm">
                {t(alert.kind === "ORDER_WAITING" ? "alertOrderWaiting" : "alertManyCalls", alert)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### 4.10 DateRangePicker Component

File: `src/components/admin/metrics/date-range-picker.tsx`

```typescript
"use client";

import { useState } from "react";
import { Calendar, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type Period = "today" | "yesterday" | "week" | "month" | "custom";

interface DateRangePickerProps {
  value: Period;
  onChange: (period: Period, dates?: { start: Date; end: Date }) => void;
}

const PERIODS = [
  { value: "today" as const, label: "Today" },
  { value: "yesterday" as const, label: "Yesterday" },
  { value: "week" as const, label: "This Week" },
  { value: "month" as const, label: "This Month" },
  { value: "custom" as const, label: "Custom" },
];

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedLabel = PERIODS.find((p) => p.value === value)?.label || "Select";

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary/50 border border-border/50 hover:bg-secondary transition-colors"
      >
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{selectedLabel}</span>
        <ChevronDown className={cn(
          "h-4 w-4 text-muted-foreground transition-transform",
          isOpen && "rotate-180"
        )} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full right-0 mt-2 z-50 w-48 p-2 rounded-xl bg-card border border-border shadow-xl">
            {PERIODS.map((period) => (
              <button
                key={period.value}
                onClick={() => {
                  onChange(period.value);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                  value === period.value
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-secondary"
                )}
              >
                {period.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
```

### 4.11 ExportButton Component

File: `src/components/admin/metrics/export-button.tsx`

```typescript
"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExportButtonProps {
  onExport: (format: "csv" | "pdf") => void;
}

export function ExportButton({ onExport }: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        <Download className="h-4 w-4" />
        <span className="text-sm font-medium">Export</span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full right-0 mt-2 z-50 w-40 p-2 rounded-xl bg-card border border-border shadow-xl">
            <button
              onClick={() => {
                onExport("csv");
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-secondary transition-colors"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Excel (CSV)
            </button>
            <button
              onClick={() => {
                onExport("pdf");
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-secondary transition-colors"
            >
              <FileText className="h-4 w-4" />
              PDF
            </button>
          </div>
        </>
      )}
    </div>
  );
}
```

---

## 5. Charts Library

### 5.1 Dependency

Install Recharts (charting library for React):

```bash
npm install recharts
```

### 5.2 Types for Recharts

Add to `src/types/recharts.d.ts`:

```typescript
declare module 'recharts' {
  export * from 'recharts';
}
```

---

## 6. Translations

### 6.1 Add to messages/pt.json

(Portuguese strings are shown without diacritics in this document.)

```json
{
  "metrics": {
    "title": "Metricas",
    "overview": "Visao Geral",
    "orders": "Pedidos",
    "products": "Produtos",
    "team": "Equipe",
    "satisfaction": "Satisfacao",
    "realTime": "Tempo Real",
    "totalOrders": "Total de Pedidos",
    "totalRevenue": "Receita Total",
    "avgTicket": "Ticket Medio",
    "avgRating": "Avaliacao Media",
    "ordersByHour": "Pedidos por Hora",
    "ordersByDay": "Pedidos por Dia",
    "topProducts": "Produtos Mais Vendidos",
    "categories": "Categorias",
    "timeMetrics": "Tempos de Atendimento",
    "confirmationTime": "Tempo de Confirmacao",
    "preparationTime": "Tempo de Preparo",
    "totalTime": "Tempo Total",
    "sla": "SLA",
    "delayedOrders": "Pedidos Atrasados",
    "teamPerformance": "Performance da Equipe",
    "waiters": "Garcons",
    "kitchen": "Cozinha",
    "callsHandled": "Chamados Atendidos",
    "avgResponseTime": "Tempo Medio de Resposta",
    "ordersHandled": "Pedidos Preparados",
    "avgPrepTime": "Tempo Medio de Preparo",
    "pending": "Pendentes",
    "confirmed": "Confirmados",
    "preparing": "Preparando",
    "ready": "Prontos",
    "occupiedTables": "Mesas Ocupadas",
    "openCalls": "Chamados Abertos",
    "alerts": "Alertas",
    "alertOrderWaiting": "{table} esta esperando ha {minutes} min",
    "alertManyCalls": "{count} chamados aguardando atendimento",
    "today": "Hoje",
    "yesterday": "Ontem",
    "thisWeek": "Esta Semana",
    "thisMonth": "Este Mes",
    "custom": "Personalizado",
    "export": "Exportar",
    "exportCSV": "Excel (CSV)",
    "exportPDF": "PDF",
    "vsLastPeriod": "vs periodo anterior",
    "noData": "Sem dados para o periodo selecionado"
  }
}
```

### 6.2 Add to messages/es.json

(Spanish strings are shown without diacritics in this document.)

```json
{
  "metrics": {
    "title": "Metricas",
    "overview": "Vision General",
    "orders": "Pedidos",
    "products": "Productos",
    "team": "Equipo",
    "satisfaction": "Satisfaccion",
    "realTime": "Tiempo Real",
    "totalOrders": "Total de Pedidos",
    "totalRevenue": "Ingresos Totales",
    "avgTicket": "Ticket Promedio",
    "avgRating": "Calificacion Promedio",
    "ordersByHour": "Pedidos por Hora",
    "ordersByDay": "Pedidos por Dia",
    "topProducts": "Productos Mas Vendidos",
    "categories": "Categorias",
    "timeMetrics": "Tiempos de Atencion",
    "confirmationTime": "Tiempo de Confirmacion",
    "preparationTime": "Tiempo de Preparacion",
    "totalTime": "Tiempo Total",
    "sla": "SLA",
    "delayedOrders": "Pedidos Retrasados",
    "teamPerformance": "Rendimiento del Equipo",
    "waiters": "Camareros",
    "kitchen": "Cocina",
    "callsHandled": "Llamadas Atendidas",
    "avgResponseTime": "Tiempo Promedio de Respuesta",
    "ordersHandled": "Pedidos Preparados",
    "avgPrepTime": "Tiempo Promedio de Preparacion",
    "pending": "Pendientes",
    "confirmed": "Confirmados",
    "preparing": "Preparando",
    "ready": "Listos",
    "occupiedTables": "Mesas Ocupadas",
    "openCalls": "Llamadas Abiertas",
    "alerts": "Alertas",
    "alertOrderWaiting": "{table} lleva {minutes} min esperando",
    "alertManyCalls": "{count} llamadas esperando atencion",
    "today": "Hoy",
    "yesterday": "Ayer",
    "thisWeek": "Esta Semana",
    "thisMonth": "Este Mes",
    "custom": "Personalizado",
    "export": "Exportar",
    "exportCSV": "Excel (CSV)",
    "exportPDF": "PDF",
    "vsLastPeriod": "vs periodo anterior",
    "noData": "Sin datos para el periodo seleccionado"
  }
}
```

### 6.3 Add to messages/en.json

```json
{
  "metrics": {
    "title": "Metrics",
    "overview": "Overview",
    "orders": "Orders",
    "products": "Products",
    "team": "Team",
    "satisfaction": "Satisfaction",
    "realTime": "Real Time",
    "totalOrders": "Total Orders",
    "totalRevenue": "Total Revenue",
    "avgTicket": "Average Ticket",
    "avgRating": "Average Rating",
    "ordersByHour": "Orders by Hour",
    "ordersByDay": "Orders by Day",
    "topProducts": "Top Selling Products",
    "categories": "Categories",
    "timeMetrics": "Service Times",
    "confirmationTime": "Confirmation Time",
    "preparationTime": "Preparation Time",
    "totalTime": "Total Time",
    "sla": "SLA",
    "delayedOrders": "Delayed Orders",
    "teamPerformance": "Team Performance",
    "waiters": "Waiters",
    "kitchen": "Kitchen",
    "callsHandled": "Calls Handled",
    "avgResponseTime": "Avg Response Time",
    "ordersHandled": "Orders Handled",
    "avgPrepTime": "Avg Prep Time",
    "pending": "Pending",
    "confirmed": "Confirmed",
    "preparing": "Preparing",
    "ready": "Ready",
    "occupiedTables": "Occupied Tables",
    "openCalls": "Open Calls",
    "alerts": "Alerts",
    "alertOrderWaiting": "{table} has been waiting for {minutes} min",
    "alertManyCalls": "{count} calls waiting for service",
    "today": "Today",
    "yesterday": "Yesterday",
    "thisWeek": "This Week",
    "thisMonth": "This Month",
    "custom": "Custom",
    "export": "Export",
    "exportCSV": "Excel (CSV)",
    "exportPDF": "PDF",
    "vsLastPeriod": "vs last period",
    "noData": "No data for selected period"
  }
}
```

---

## 7. Implementation Order

### Step 1: Database (1 task)
1. [ ] Add the `delivered_at` field to the Order model in schema.prisma

### Step 2: Metrics APIs (10 tasks)
2. [ ] Create `GET /api/admin/metrics/summary`
3. [ ] Create `GET /api/admin/metrics/orders/hourly`
4. [ ] Create `GET /api/admin/metrics/orders/weekday`
5. [ ] Create `GET /api/admin/metrics/products/top`
6. [ ] Create `GET /api/admin/metrics/categories`
7. [ ] Create `GET /api/admin/metrics/tables`
8. [ ] Create `GET /api/admin/metrics/team/waiters`
9. [ ] Create `GET /api/admin/metrics/team/cooks`
10. [ ] Create `GET /api/admin/metrics/real-time`
11. [ ] Create `GET /api/admin/metrics/comparison`

### Step 3: Dependencies (1 task)
12. [ ] Install `recharts` and add types

### Step 4: Base Components (4 tasks)
13. [ ] Create `date-range-picker.tsx`
14. [ ] Create `export-button.tsx`
15. [ ] Create `metrics-overview.tsx`
16. [ ] Create `time-metrics-card.tsx`

### Step 5: Chart Components (4 tasks)
17. [ ] Create `orders-by-hour-chart.tsx`
18. [ ] Create `orders-by-day-chart.tsx`
19. [ ] Create `top-products-chart.tsx`
20. [ ] Create `categories-chart.tsx`

### Step 6: Team and Real-Time Components (3 tasks)
21. [ ] Create `team-performance.tsx`
22. [ ] Create `real-time-panel.tsx`
23. [ ] Create `alerts-panel.tsx`

### Step 7: Pages (2 tasks)
24. [ ] Update the main admin page with metrics
25. [ ] Create the `/admin/metrics` page with the complete dashboard

### Step 8: Translations and Tests (3 tasks)
26. [ ] Add metrics translations in PT/ES/EN
27. [ ] Test all APIs
28. [ ] Test all components

---

## 8. File Structure (New)

```
src/
├── app/
│   ├── (dashboard)/
│   │   └── admin/
│   │       ├── page.tsx                    # Modify
│   │       └── metrics/
│   │           └── page.tsx                # NEW
│   └── api/
│       └── admin/
│           └── metrics/
│               ├── summary/
│               │   └── route.ts            # NEW
│               ├── orders/
│               │   ├── hourly/
│               │   │   └── route.ts        # NEW
│               │   └── weekday/
│               │       └── route.ts        # NEW
│               ├── products/
│               │   └── top/
│               │       └── route.ts        # NEW
│               ├── categories/
│               │   └── route.ts            # NEW
│               ├── tables/
│               │   └── route.ts            # NEW
│               ├── team/
│               │   ├── waiters/
│               │   │   └── route.ts        # NEW
│               │   └── cooks/
│               │       └── route.ts        # NEW
│               ├── real-time/
│               │   └── route.ts            # NEW
│               └── comparison/
│                   └── route.ts            # NEW
└── components/
    └── admin/
        └── metrics/
            ├── metrics-overview.tsx        # NEW
            ├── time-metrics-card.tsx       # NEW
            ├── orders-by-hour-chart.tsx    # NEW
            ├── orders-by-day-chart.tsx     # NEW
            ├── top-products-chart.tsx      # NEW
            ├── categories-chart.tsx        # NEW
            ├── team-performance.tsx        # NEW
            ├── real-time-panel.tsx         # NEW
            ├── alerts-panel.tsx            # NEW
            ├── date-range-picker.tsx       # NEW
            └── export-button.tsx           # NEW
```

---

## 9. Technical Considerations

### 9.1 Performance

- Use `useMemo` for heavy metric calculations
- Implement caching in the APIs (revalidate every 1 minute)
- Use `React.lazy` to load chart components
- Limit the maximum query period (90 days)

### 9.2 Security

- All APIs protected for ADMIN and MANAGER
- Validate input dates
- Sanitize query parameters

### 9.3 Mobile

- Responsive charts with `ResponsiveContainer`
- Cards in an adaptive grid (1 column on mobile)
- Touch-friendly period selection

### 9.4 Accessibility

- Colors with adequate contrast
- Labels on charts
- Descriptive tooltips

---

## 10. Data Export

### 10.1 CSV

```typescript
function exportToCSV(data: any[], filename: string) {
  const headers = Object.keys(data[0]).join(",");
  const rows = data.map((row) => Object.values(row).join(","));
  const csv = [headers, ...rows].join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
}
```

### 10.2 PDF (using jsPDF)

```bash
npm install jspdf jspdf-autotable
```

```typescript
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

function exportToPDF(data: any[], title: string) {
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text(title, 14, 22);

  autoTable(doc, {
    head: [Object.keys(data[0])],
    body: data.map((row) => Object.values(row)),
    startY: 30,
  });

  doc.save(`${title}.pdf`);
}
```

---

## 11. Dashboard Mockup

```
┌─────────────────────────────────────────────────────────────────┐
│  📊 Metrics                         [Today ▼]  [Export ▼]      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐│
│  │ 🛒 150      │ │ 💰 R$13.4k  │ │ 🎫 R$89.50  │ │ ⭐ 4.5      ││
│  │ Orders      │ │ Revenue     │ │ Avg. Ticket │ │ Rating      ││
│  │ ↑ 15.4%     │ │ ↑ 21.5%     │ │ ↑ 5.3%      │ │             ││
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘│
│                                                                  │
│  ┌─────────────────────────────┐ ┌─────────────────────────────┐│
│  │ 📈 Orders by Hour           │ │ 🥧 Categories               ││
│  │                             │ │                             ││
│  │     ▄▄▄▄▄▄▄                 │ │      ████  Meats 45%       ││
│  │   ▄▄█████████▄▄             │ │    ██░░██  Drinks 25%      ││
│  │ ▄▄██████████████▄▄          │ │   ██░░░░██ Desserts 15%    ││
│  │ ─────────────────────       │ │   ██░░░░░░██ Others 15%    ││
│  │ 09 10 11 12 13 14 15 16     │ │                             ││
│  └─────────────────────────────┘ └─────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────┐ ┌─────────────────────────────┐│
│  │ 🏆 Top Products             │ │ ⏱️ Times                    ││
│  │                             │ │                             ││
│  │ 1. Premium Picanha ████ 85  │ │ Confirmation:    45s       ││
│  │ 2. Craft Beer      ███  72  │ │ Preparation:     12m       ││
│  │ 3. Petit Gateau    ██   58  │ │ Total:           20m       ││
│  │ 4. BBQ Ribs        ██   45  │ │ ──────────────────────     ││
│  │ 5. Caipirinha      █    38  │ │ SLA (< 15min):   92.5%     ││
│  └─────────────────────────────┘ └─────────────────────────────┘│
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 👥 Team Performance                                         │ │
│  │                                                              │ │
│  │ Waiters                      │ Kitchen                      │ │
│  │ ─────────────────────────────┼─────────────────────────────│ │
│  │ 🥇 John   45 calls     ⭐4.7 │ 🥇 Maria  85 orders   95% SLA│ │
│  │ 🥈 Peter  38 calls     ⭐4.5 │ 🥈 Carlos 72 orders   92% SLA│ │
│  │ 🥉 Anna   32 calls     ⭐4.8 │ 🥉 Joe    65 orders   88% SLA│ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ ⚡ Real Time                                                │ │
│  │                                                              │ │
│  │ [3 Pend] [5 Conf] [4 Prep] [2 Ready]  🪑 12 tables  📞 2   │ │
│  │                                                              │ │
│  │ ⚠️ Table 3 order waiting for 18 min                         │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Approval

This plan covers all the metrics and components needed for a complete admin dashboard.

Total tasks: 28
Dependencies: recharts, jspdf (optional)

Ready for implementation after approval.
