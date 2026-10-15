"use client";

import { useEffect, useState } from "react";

let cached: string | null = null;
let inflight: Promise<string> | null = null;

// Restaurant currency for staff/admin screens (GET /api/settings). Falls back to EUR.
// Superadmin: pass the selected restaurantId.
export function useCurrency(restaurantId?: string | null): string {
  const [currency, setCurrency] = useState(cached ?? "EUR");

  useEffect(() => {
    if (restaurantId === undefined && cached) return;
    const url = restaurantId
      ? `/api/settings?restaurantId=${restaurantId}`
      : "/api/settings";
    const p =
      restaurantId === undefined && inflight
        ? inflight
        : fetch(url)
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => (d?.currency as string) || "EUR")
            .catch(() => "EUR");
    if (restaurantId === undefined) inflight = p;
    p.then((c) => {
      if (restaurantId === undefined) cached = c;
      setCurrency(c);
    });
  }, [restaurantId]);

  return currency;
}
