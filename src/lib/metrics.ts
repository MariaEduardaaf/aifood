import type { OrderStatus } from "@prisma/client";

// Orders that count as sales: placed and accepted, never cancelled
export const SALE_EXCLUDED_STATUSES: OrderStatus[] = ["PENDING", "CANCELLED"];

export const DEFAULT_TIMEZONE = "Europe/Madrid";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const formatters = new Map<string, Intl.DateTimeFormat>();

// Wall-clock parts of `date` in an IANA zone. weekday follows Date.getDay()
// (0 = Sunday), month is 1-12.
export function zonedParts(date: Date, timeZone: string) {
  let fmt = formatters.get(timeZone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      weekday: "short",
    });
    formatters.set(timeZone, fmt);
  }
  const parts: Record<string, string> = {};
  for (const p of fmt.formatToParts(date)) parts[p.type] = p.value;
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
    weekday: WEEKDAYS.indexOf(parts.weekday),
  };
}

// Milliseconds the zone is ahead of UTC at instant t
function zoneOffset(t: number, timeZone: string) {
  const p = zonedParts(new Date(t), timeZone);
  const wall = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return wall - (t - (((t % 1000) + 1000) % 1000));
}

// UTC instant of local midnight on (year, month, day) in the zone. `day` may
// overflow or be <= 0; Date.UTC normalises it.
function startOfZonedDay(year: number, month: number, day: number, timeZone: string) {
  const guess = Date.UTC(year, month - 1, day);
  const first = guess - zoneOffset(guess, timeZone);
  // Second pass corrects for a DST change between the guess and the result
  return new Date(guess - zoneOffset(first, timeZone));
}

// Date range for a metrics period, with day boundaries in the restaurant's
// timezone (the server runs in UTC).
export function getPeriodRange(
  period: string,
  timeZone: string = DEFAULT_TIMEZONE,
  now: Date = new Date(),
) {
  const { year, month, day } = zonedParts(now, timeZone);
  const dayStart = (daysAgo: number) =>
    startOfZonedDay(year, month, day - daysAgo, timeZone);

  switch (period) {
    case "yesterday":
      return { start: dayStart(1), end: new Date(dayStart(0).getTime() - 1) };
    case "week": // last 7 days, today included
      return { start: dayStart(6), end: now };
    case "month": // current calendar month
      return { start: startOfZonedDay(year, month, 1, timeZone), end: now };
    case "30days": // last 30 days, today included
      return { start: dayStart(29), end: now };
    case "lastweekday": // same weekday a week ago, up to the same time of day
      return {
        start: dayStart(7),
        end: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      };
    case "today":
    default:
      return { start: dayStart(0), end: now };
  }
}
