import { test } from "node:test";
import assert from "node:assert/strict";
import { localizedText } from "../../src/lib/i18n/text";

test("localizedText picks the requested locale", () => {
  assert.equal(localizedText({ es: "Hola", en: "Hello" }, "en", "es"), "Hello");
});

test("localizedText falls back to the default, then to any value", () => {
  assert.equal(localizedText({ es: "Hola", en: "Hello" }, "de", "es"), "Hola");
  assert.equal(localizedText({ en: "Hello" }, "de", "es"), "Hello");
  assert.equal(localizedText({ es: "", en: "Hello" }, "es", "es"), "Hello");
});

test("localizedText tolerates bad input", () => {
  assert.equal(localizedText(null, "es", "es"), "");
  assert.equal(localizedText("oops", "es", "es"), "");
  assert.equal(localizedText(["a"], "es", "es"), "");
  assert.equal(localizedText({ es: 5 }, "es", "es"), "");
});
