import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { DEFAULT_SETTINGS, settingsSelect, type CoreSettings } from "@/lib/settings";

export type PublicTable = {
  id: string;
  label: string;
  restaurant_id: string;
  restaurant: { name: string };
  settings: CoreSettings;
};

// Resolves the table behind a guest QR token (`table` query/body field).
// Guest endpoints never accept table ids. Unknown or inactive tables are 404,
// an inactive restaurant is 403.
export async function findPublicTable(
  token: unknown,
): Promise<{ table: PublicTable } | { error: NextResponse }> {
  if (typeof token !== "string" || !token || token.length > 100) {
    return {
      error: NextResponse.json({ error: "table is required" }, { status: 400 }),
    };
  }

  const table = await prisma.table.findUnique({
    where: { qr_token: token },
    select: {
      id: true,
      label: true,
      active: true,
      restaurant_id: true,
      restaurant: {
        select: { name: true, active: true, settings: { select: settingsSelect } },
      },
    },
  });

  if (!table || !table.active) {
    return {
      error: NextResponse.json({ error: "Table not found" }, { status: 404 }),
    };
  }

  if (!table.restaurant.active) {
    return {
      error: NextResponse.json(
        { error: "Restaurant is inactive" },
        { status: 403 },
      ),
    };
  }

  return {
    table: {
      id: table.id,
      label: table.label,
      restaurant_id: table.restaurant_id,
      restaurant: { name: table.restaurant.name },
      settings: table.restaurant.settings ?? DEFAULT_SETTINGS,
    },
  };
}

export const orderingDisabled = () =>
  NextResponse.json({ error: "ordering_disabled" }, { status: 403 });
