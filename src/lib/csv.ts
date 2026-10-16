import { SUPPORTED_LOCALES } from "./i18n/locales";
import { isAllergenCode } from "./allergens";

// Minimal RFC 4180 parser: quoted fields, "" escapes, CR/LF, newlines inside
// quotes. The delimiter is "," unless the header line has more ";" (Spanish
// Excel exports use ";").
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const headerLine = src.slice(0, src.search(/\r?\n|$/));
  const count = (ch: string) => headerLine.split(ch).length - 1;
  const delimiter = count(";") > count(",") ? ";" : ",";

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === delimiter) {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  // Drop blank lines
  return rows.filter((r) => r.some((cell) => cell.trim()));
}

export type MenuCsvRow = {
  row: number; // 1-based line in the file, header = 1
  category: string;
  names: Record<string, string>;
  descriptions: Record<string, string>;
  price: number;
  allergens: string[];
  image_url: string | null;
};

export type MenuCsvError = { row: number; message: string };

// File-level problems fail the whole import; row problems skip only that row
export type MenuCsvResult =
  | { ok: true; rows: MenuCsvRow[]; errors: MenuCsvError[] }
  | { ok: false; error: string };

export const MENU_CSV_MAX_ROWS = 500;

// Turns a menu CSV into validated rows. Columns (case-insensitive):
// category, name_<locale>..., description_<locale>..., price, allergens, image_url
// `name_<defaultLocale>`, `category` and `price` are required. `allergens` is a
// list of codes separated by ";" (also "|", "," or spaces).
export function parseMenuCsv(text: string, defaultLocale: string): MenuCsvResult {
  const [header, ...body] = parseCsv(text);
  const fail = (error: string) => ({ ok: false as const, error });

  if (!header) return fail("The file is empty");
  const cols = header.map((h) => h.trim().toLowerCase());
  const col = (name: string) => cols.indexOf(name);

  for (const required of ["category", `name_${defaultLocale}`, "price"]) {
    if (col(required) === -1) return fail(`Missing column: ${required}`);
  }
  if (body.length === 0) return fail("The file has no rows");
  if (body.length > MENU_CSV_MAX_ROWS) {
    return fail(`Too many rows (max ${MENU_CSV_MAX_ROWS})`);
  }

  const rows: MenuCsvRow[] = [];
  const errors: MenuCsvError[] = [];

  body.forEach((cells, index) => {
    const line = index + 2;
    const cell = (name: string) => {
      const i = col(name);
      return i === -1 ? "" : (cells[i] ?? "").trim();
    };

    const names: Record<string, string> = {};
    const descriptions: Record<string, string> = {};
    for (const locale of SUPPORTED_LOCALES) {
      if (cell(`name_${locale}`)) names[locale] = cell(`name_${locale}`);
      if (cell(`description_${locale}`)) {
        descriptions[locale] = cell(`description_${locale}`);
      }
    }

    // Accept "3,50" as well as "3.50"
    const rawPrice = cell("price").replace(/[€$£\s]/g, "");
    const price = Number(
      rawPrice.includes(",") && !rawPrice.includes(".")
        ? rawPrice.replace(",", ".")
        : rawPrice,
    );

    const allergens = cell("allergens")
      .toLowerCase()
      .split(/[|;,\s]+/)
      .filter(Boolean);
    const badAllergen = allergens.find((a) => !isAllergenCode(a));
    const image = cell("image_url");

    const error = !cell("category")
      ? "category is empty"
      : cell("category").length > 120
        ? "category is longer than 120 characters"
        : !names[defaultLocale]
          ? `name_${defaultLocale} is empty`
          : Object.values(names).some((n) => n.length > 120)
            ? "a name is longer than 120 characters"
            : Object.values(descriptions).some((d) => d.length > 500)
              ? "a description is longer than 500 characters"
              : !rawPrice || !Number.isFinite(price) || price < 0 || price > 99999.99
                ? `invalid price "${cell("price")}"`
                : badAllergen
                  ? `unknown allergen "${badAllergen}"`
                  : image && !/^https?:\/\/\S+$/i.test(image)
                    ? "image_url must be an http(s) URL"
                    : null;

    if (error) {
      errors.push({ row: line, message: error });
      return;
    }

    rows.push({
      row: line,
      category: cell("category"),
      names,
      descriptions,
      price: Math.round(price * 100) / 100,
      allergens: Array.from(new Set(allergens)),
      image_url: image || null,
    });
  });

  return { ok: true, rows, errors };
}
