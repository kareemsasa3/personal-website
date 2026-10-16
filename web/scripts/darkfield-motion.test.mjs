import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseDuration, parseEase } from "../src/utils/motionTokens.ts";

const tokens = await readFile(new URL("../src/styles/darkfield/tokens.css", import.meta.url), "utf8");
const values = (prefix) => [...tokens.matchAll(new RegExp(`--(${prefix}-[a-z]+):\\s*([^;]+);`, "g"))].map(([, n, v]) => [n, v]);

test("every duration token parses to seconds", () => {
  const list = values("dur");
  assert.ok(list.length > 0, "no duration tokens found");
  for (const [name, value] of list) {
    const ms = parseFloat(value) * (value.trim().endsWith("ms") ? 1 : 1000);
    assert.equal(parseDuration(value), ms / 1000, name);
  }
});

test("every easing token parses to a Framer easing that runs from 0 to 1", () => {
  const list = values("ease");
  assert.ok(list.length > 0, "no easing tokens found");
  for (const [name, value] of list) {
    const ease = parseEase(value);
    if (typeof ease === "function") { assert.equal(ease(0), 0, name); assert.equal(ease(1), 1, name); }
    else if (Array.isArray(ease)) assert.equal(ease.length, 4, name);
    else assert.equal(ease, "linear", name);
  }
});
