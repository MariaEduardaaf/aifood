import { test } from "node:test";
import assert from "node:assert/strict";
import { UPLOAD_NAME, isUploadedImageUrl, matchesMagicBytes } from "../../src/lib/uploads";

const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d]);
const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46]);
const GIF = new TextEncoder().encode("GIF89a\x01\x00");
const WEBP = new TextEncoder().encode("RIFF\x24\x00\x00\x00WEBPVP8 ");

test("upload names: only generated hex names with a known extension", () => {
  const name = `${"a1".repeat(16)}.png`;
  assert.ok(UPLOAD_NAME.test(name));
  for (const ext of ["jpg", "webp", "gif"]) assert.ok(UPLOAD_NAME.test(`${"0".repeat(32)}.${ext}`));
  for (const bad of [
    "../../etc/passwd",
    `../${name}`,
    `${"a".repeat(31)}.png`,
    `${"A".repeat(32)}.png`,
    `${"a".repeat(32)}.svg`,
    `${"a".repeat(32)}.jpeg`,
    `${"a".repeat(32)}.png/..`,
    `${"a".repeat(32)}.png\n`,
    "",
  ]) {
    assert.ok(!UPLOAD_NAME.test(bad), JSON.stringify(bad));
  }
});

test("uploaded image URLs: same-origin /api/uploads path only", () => {
  assert.ok(isUploadedImageUrl(`/api/uploads/${"f".repeat(32)}.webp`));
  for (const bad of [
    `https://evil.com/api/uploads/${"f".repeat(32)}.webp`,
    `//evil.com/api/uploads/${"f".repeat(32)}.webp`,
    `/api/uploads/../${"f".repeat(32)}.webp`,
    `/api/uploads/${"f".repeat(32)}.webp?x=1`,
    "javascript:alert(1)",
  ]) {
    assert.ok(!isUploadedImageUrl(bad), bad);
  }
});

test("magic bytes must match the declared image type", () => {
  assert.ok(matchesMagicBytes("image/png", PNG));
  assert.ok(matchesMagicBytes("image/jpeg", JPEG));
  assert.ok(matchesMagicBytes("image/gif", GIF));
  assert.ok(matchesMagicBytes("image/webp", WEBP));

  assert.ok(!matchesMagicBytes("image/png", JPEG));
  assert.ok(!matchesMagicBytes("image/jpeg", PNG));
  assert.ok(!matchesMagicBytes("image/webp", new TextEncoder().encode("RIFF\x24\x00\x00\x00WAVEfmt ")));
  assert.ok(!matchesMagicBytes("image/png", new TextEncoder().encode("<svg xmlns=")));
  assert.ok(!matchesMagicBytes("image/png", new Uint8Array()));
  assert.ok(!matchesMagicBytes("image/svg+xml", PNG));
});
