import type { OrderStatus } from "@prisma/client";

// Orders that count as sales: placed and accepted, never cancelled
export const SALE_EXCLUDED_STATUSES: OrderStatus[] = ["PENDING", "CANCELLED"];

// Date range for a metrics period. Day boundaries use the server's local
// time, which follows the TZ env var when it is set.
// TODO: per-restaurant timezone
export function getPeriodRange(period: string, now: Date = new Date()) {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const daysAgo = (days: number) => {
    const d = new Date(startOfToday);
    d.setDate(d.getDate() - days);
    return d;
  };

  switch (period) {
    case "yesterday": {
      const start = daysAgo(1);
      return { start, end: new Date(startOfToday.getTime() - 1) };
    }
    case "week": // last 7 days, today included
      return { start: daysAgo(6), end: now };
    case "month": // current calendar month
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: now,
      };
    case "30days": // last 30 days, today included
      return { start: daysAgo(29), end: now };
    case "today":
    default:
      return { start: startOfToday, end: now };
  }
}
