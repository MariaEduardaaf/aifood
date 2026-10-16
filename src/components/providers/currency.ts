"use client";

import { useEffect, useState } from "react";

interface StaffSettings {
  currency: string;
  ordering_enabled: boolean;
}

const DEFAULTS: StaffSettings = { currency: "EUR", ordering_enabled: true };

let cached: StaffSettings | null = null;
let inflight: Promise<StaffSettings> | null = null;

// Restaurant settings for staff/admin screens (GET /api/settings), cached per
// page load. Superadmin: pass the selected restaurantId.
function useStaffSettings(restaurantId?: string | null): StaffSettings | null {
  const [settings, setSettings] = useState<StaffSettings | null>(cached);

  useEffect(() => {
    if (restaurantId === undefined && cached) return;
    const url = restaurantId ? `/api/settings?restaurantId=${restaurantId}` : "/api/settings";
    const p =
      restaurantId === undefined && inflight
        ? inflight
        : fetch(url)
            .then((r) => (r.ok ? r.json() : null))
            .then(
              (d): StaffSettings => ({
                currency: (d?.currency as string) || DEFAULTS.currency,
                ordering_enabled: d?.ordering_enabled !== false,
              }),
            )
            .catch(() => DEFAULTS);
    if (restaurantId === undefined) inflight = p;
    p.then((s) => {
      if (restaurantId === undefined) cached = s;
      setSettings(s);
    });
  }, [restaurantId]);

  return settings;
}

// Restaurant currency (falls back to EUR while loading)
export function useCurrency(restaurantId?: string | null): string {
  return useStaffSettings(restaurantId)?.currency ?? DEFAULTS.currency;
}

// Lite mode flag; null while loading so screens can avoid flashing order UI
export function useOrderingEnabled(restaurantId?: string | null): boolean | null {
  return useStaffSettings(restaurantId)?.ordering_enabled ?? null;
}
