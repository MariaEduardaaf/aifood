import { test } from "node:test";
import assert from "node:assert/strict";
import { safeCallbackUrl } from "../../src/lib/safe-redirect";

test("safeCallbackUrl keeps same-origin relative paths", () => {
  assert.equal(safeCallbackUrl("/admin/today?x=1", "/"), "/admin/today?x=1");
});

test("safeCallbackUrl rejects open redirects", () => {
  for (const bad of [
    null,
    "",
    "https://evil.com",
    "//evil.com",
    "/\\evil.com",
    "javascript:alert(1)",
    "/ok\u0000",
    "admin",
  ]) {
    assert.equal(safeCallbackUrl(bad, "/fallback"), "/fallback", String(bad));
  }
});
