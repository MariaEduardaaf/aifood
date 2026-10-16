import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { validationError } from "@/lib/api";
import { parseMenuCsv } from "@/lib/csv";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

const MAX_CSV_BYTES = 1024 * 1024;

const jsonSchema = z
  .object({
    url: z.string().url().max(2000).optional(),
    csv: z.string().max(MAX_CSV_BYTES).optional(),
    restaurantId: z.string().optional(),
  })
  .refine((body) => !!body.url !== !!body.csv, "Send either url or csv");

// Only Google Sheets links are fetched, so the endpoint cannot be used to
// reach arbitrary hosts (SSRF). Edit links are turned into CSV export links.
function sheetCsvUrl(raw: string): string | null {
  const url = new URL(raw);
  if (url.protocol !== "https:" || url.hostname !== "docs.google.com") {
    return null;
  }
  if (!url.pathname.startsWith("/spreadsheets/")) return null;
  const edit = url.pathname.match(/^(\/spreadsheets\/d\/[^/]+)\/(edit|view)?/);
  if (edit && !url.pathname.includes("/pub")) {
    const gid = url.searchParams.get("gid") ?? url.hash.match(/gid=(\d+)/)?.[1];
    return `https://docs.google.com${edit[1]}/export?format=csv${gid ? `&gid=${gid}` : ""}`;
  }
  return url.toString();
}

async function fetchCsv(raw: string): Promise<string | NextResponse> {
  const target = sheetCsvUrl(raw);
  if (!target) {
    return NextResponse.json(
      { error: "url: must be a Google Sheets link (https://docs.google.com/spreadsheets/...)" },
      { status: 400 },
    );
  }
  const res = await fetch(target, {
    redirect: "follow",
    signal: AbortSignal.timeout(10_000),
  }).catch(() => null);
  if (!res || !res.ok) {
    return NextResponse.json(
      { error: "Could not download the sheet. Publish it to the web as CSV and try again." },
      { status: 400 },
    );
  }
  const text = await res.text();
  if (text.length > MAX_CSV_BYTES) {
    return NextResponse.json({ error: "File too large (max 1MB)" }, { status: 400 });
  }
  if (/^\s*<(!doctype|html)/i.test(text)) {
    return NextResponse.json(
      { error: "The link returned a web page, not CSV. Publish the sheet to the web as CSV." },
      { status: 400 },
    );
  }
  return text;
}

// POST /api/admin/menu/import - Import menu items from CSV.
// Body: multipart (file, restaurantId?) or JSON { url | csv, restaurantId? }.
// Categories are matched by name in the default locale and created when
// missing; items are matched by default-locale name inside their category and
// updated, or created. Invalid rows are skipped and reported in `errors`;
// file-level problems (missing column, empty file) are a 400.
// Response: { created: { categories, items }, updated: { items }, errors: [{ row, message }] }
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let csv: string;
    let restaurantIdInput: string | undefined;

    if (request.headers.get("content-type")?.includes("multipart/form-data")) {
      const form = await request.formData().catch(() => null);
      const file = form?.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }
      if (file.size > MAX_CSV_BYTES) {
        return NextResponse.json({ error: "File too large (max 1MB)" }, { status: 400 });
      }
      csv = await file.text();
      const rid = form?.get("restaurantId");
      restaurantIdInput = typeof rid === "string" ? rid : undefined;
    } else {
      const body = await request.json().catch(() => null);
      const validation = jsonSchema.safeParse(body);
      if (!validation.success) return validationError(validation.error);
      restaurantIdInput = validation.data.restaurantId;
      if (validation.data.url) {
        const fetched = await fetchCsv(validation.data.url);
        if (fetched instanceof NextResponse) return fetched;
        csv = fetched;
      } else {
        csv = validation.data.csv!;
      }
    }

    const restaurantId =
      session.user.role === "SUPER_ADMIN"
        ? restaurantIdInput
        : session.user.restaurant_id;

    if (!restaurantId) {
      return NextResponse.json(
        { error: "restaurantId is required" },
        { status: 400 },
      );
    }

    const { default_locale } = await getSettings(restaurantId);
    const parsed = parseMenuCsv(csv, default_locale);

    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const key = (text: string) => text.trim().toLowerCase();

    const summary = await prisma.$transaction(
      async (tx) => {
        const result = { categoriesCreated: 0, itemsCreated: 0, itemsUpdated: 0 };

        const categories = await tx.category.findMany({
          where: { restaurant_id: restaurantId },
          select: { id: true, names: true, order: true },
        });
        const categoryIds = new Map<string, string>();
        let nextCategoryOrder = 0;
        for (const c of categories) {
          const name = (c.names as Record<string, string>)[default_locale];
          if (name && !categoryIds.has(key(name))) categoryIds.set(key(name), c.id);
          nextCategoryOrder = Math.max(nextCategoryOrder, c.order + 1);
        }

        const items = await tx.menuItem.findMany({
          where: { restaurant_id: restaurantId },
          select: { id: true, category_id: true, names: true, descriptions: true, order: true },
        });
        const itemsByKey = new Map<string, (typeof items)[number]>();
        const nextItemOrder = new Map<string, number>();
        for (const item of items) {
          const name = (item.names as Record<string, string>)[default_locale];
          if (name) itemsByKey.set(`${item.category_id}|${key(name)}`, item);
          nextItemOrder.set(
            item.category_id,
            Math.max(nextItemOrder.get(item.category_id) ?? 0, item.order + 1),
          );
        }

        for (const row of parsed.rows) {
          let categoryId = categoryIds.get(key(row.category));
          if (!categoryId) {
            const created = await tx.category.create({
              data: {
                restaurant_id: restaurantId,
                names: { [default_locale]: row.category },
                order: nextCategoryOrder++,
              },
            });
            categoryId = created.id;
            categoryIds.set(key(row.category), categoryId);
            result.categoriesCreated++;
          }

          const itemKey = `${categoryId}|${key(row.names[default_locale])}`;
          const existing = itemsByKey.get(itemKey);

          if (existing) {
            await tx.menuItem.update({
              where: { id: existing.id },
              data: {
                names: { ...(existing.names as Record<string, string>), ...row.names },
                descriptions: {
                  ...(existing.descriptions as Record<string, string>),
                  ...row.descriptions,
                },
                price: row.price,
                allergens: row.allergens,
                ...(row.image_url ? { image_url: row.image_url } : {}),
              },
            });
            result.itemsUpdated++;
          } else {
            const order = nextItemOrder.get(categoryId) ?? 0;
            nextItemOrder.set(categoryId, order + 1);
            const created = await tx.menuItem.create({
              data: {
                restaurant_id: restaurantId,
                category_id: categoryId,
                names: row.names,
                descriptions: row.descriptions,
                price: row.price,
                allergens: row.allergens,
                image_url: row.image_url,
                order,
              },
              select: { id: true, category_id: true, names: true, descriptions: true, order: true },
            });
            // A repeated row later in the same file updates this item
            itemsByKey.set(itemKey, created);
            result.itemsCreated++;
          }
        }

        return result;
      },
      { timeout: 30_000 },
    );

    return NextResponse.json({
      created: { categories: summary.categoriesCreated, items: summary.itemsCreated },
      updated: { items: summary.itemsUpdated },
      errors: parsed.errors,
    });
  } catch (error) {
    console.error("Error importing menu:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
