import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCsv, parseMenuCsv } from "../../src/lib/csv";

test("parseCsv handles quotes, escaped quotes, CRLF and newlines in fields", () => {
  const rows = parseCsv('a,b,c\r\n"x, y","say ""hi""","multi\nline"\r\n\r\n1,2,3');
  assert.deepEqual(rows, [
    ["a", "b", "c"],
    ["x, y", 'say "hi"', "multi\nline"],
    ["1", "2", "3"],
  ]);
});

test("parseCsv detects semicolon exports and strips the BOM", () => {
  assert.deepEqual(parseCsv("﻿a;b\n1,5;2"), [
    ["a", "b"],
    ["1,5", "2"],
  ]);
});

test("parseMenuCsv builds locale maps, prices and allergens", () => {
  const csv = [
    "Category,name_es,name_en,description_es,price,allergens,image_url",
    'Cafés,Café con leche,Coffee with milk,"Con leche, o avena","1,80",milk,',
    "Tapas,Bravas,,,5.50,eggs;gluten;gluten,https://example.com/b.jpg",
  ].join("\n");
  const result = parseMenuCsv(csv, "es");
  assert.ok(result.ok);
  assert.deepEqual(result.rows[0], {
    row: 2,
    category: "Cafés",
    names: { es: "Café con leche", en: "Coffee with milk" },
    descriptions: { es: "Con leche, o avena" },
    price: 1.8,
    allergens: ["milk"],
    image_url: null,
  });
  assert.deepEqual(result.rows[1].allergens, ["eggs", "gluten"]);
  assert.equal(result.rows[1].image_url, "https://example.com/b.jpg");
});

test("parseMenuCsv rejects missing columns and reports bad rows by line number", () => {
  const missing = parseMenuCsv("category,name_en,price\nA,B,1", "es");
  assert.equal(missing.ok, false);
  assert.match(!missing.ok ? missing.error : "", /name_es/);

  const bad = parseMenuCsv(
    "category,name_es,price,allergens\nA,,1,\nA,B,abc,\nA,C,2,shellfish\nA,D,2,milk",
    "es",
  );
  assert.ok(bad.ok);
  assert.deepEqual(bad.errors.map((e) => e.row), [2, 3, 4]);
  assert.deepEqual(bad.rows.map((r) => r.names.es), ["D"]);
});
