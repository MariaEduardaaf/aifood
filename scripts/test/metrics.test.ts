import { test } from "node:test";
import assert from "node:assert/strict";
import { getPeriodRange, zonedParts } from "../../src/lib/metrics";

const MADRID = "Europe/Madrid";

test("today starts at local midnight in the restaurant timezone", () => {
  // 2026-07-15 08:30 UTC = 10:30 in Madrid (CEST, UTC+2)
  const now = new Date("2026-07-15T08:30:00Z");
  const { start, end } = getPeriodRange("today", MADRID, now);
  assert.equal(start.toISOString(), "2026-07-14T22:00:00.000Z");
  assert.equal(end, now);
});

test("just after local midnight is already the new day", () => {
  // 22:30 UTC on the 14th = 00:30 on the 15th in Madrid
  const now = new Date("2026-07-14T22:30:00Z");
  assert.equal(
    getPeriodRange("today", MADRID, now).start.toISOString(),
    "2026-07-14T22:00:00.000Z",
  );
  // In UTC the same instant is still the 14th
  assert.equal(
    getPeriodRange("today", "UTC", now).start.toISOString(),
    "2026-07-14T00:00:00.000Z",
  );
});

test("yesterday spans the whole previous local day", () => {
  const now = new Date("2026-01-10T12:00:00Z"); // CET, UTC+1
  const { start, end } = getPeriodRange("yesterday", MADRID, now);
  assert.equal(start.toISOString(), "2026-01-08T23:00:00.000Z");
  assert.equal(end.toISOString(), "2026-01-09T22:59:59.999Z");
});

test("week across the DST change keeps local midnight", () => {
  // DST starts 2026-03-29 in Europe; a week before 2026-04-01 is CET
  const now = new Date("2026-04-01T10:00:00Z");
  const { start } = getPeriodRange("week", MADRID, now);
  assert.equal(start.toISOString(), "2026-03-25T23:00:00.000Z"); // 26th 00:00 CET
});

test("month starts on the 1st, local time", () => {
  const now = new Date("2026-10-16T10:00:00Z");
  assert.equal(
    getPeriodRange("month", MADRID, now).start.toISOString(),
    "2026-09-30T22:00:00.000Z",
  );
});

test("lastweekday covers the same weekday up to the same time", () => {
  const now = new Date("2026-10-16T10:00:00Z");
  const { start, end } = getPeriodRange("lastweekday", MADRID, now);
  assert.equal(start.toISOString(), "2026-10-08T22:00:00.000Z");
  assert.equal(end.toISOString(), "2026-10-09T10:00:00.000Z");
});

test("zonedParts gives local hour and weekday", () => {
  const p = zonedParts(new Date("2026-10-16T23:30:00Z"), MADRID); // Sat 01:30 CEST
  assert.equal(p.hour, 1);
  assert.equal(p.weekday, 6);
  assert.equal(p.day, 17);
});
