import test from "node:test";
import assert from "node:assert/strict";
import { parseSettingsImport } from "../src/utils/settings.ts";

test("settings exports from before the migration still import", () => {
  assert.equal(parseSettingsImport({ version: 1, theme: "light" }).theme, "light");
  assert.equal(parseSettingsImport({ version: 1, theme: "dark" }).theme, "dark");
});

test("mono is an importable theme", () => {
  assert.equal(parseSettingsImport({ version: 1, theme: "mono" }).theme, "mono");
});

test("unknown themes are still rejected", () => {
  assert.throws(() => parseSettingsImport({ version: 1, theme: "neon" }), /Invalid theme/);
});
