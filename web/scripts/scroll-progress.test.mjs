import test from "node:test";
import assert from "node:assert/strict";
import { showsScrollProgress } from "../src/data/scrollProgressRoutes.ts";

// Production nginx redirects /path to /path/, so the bar must follow the route, not its spelling.
const shownRoutes = ["/projects", "/experience", "/work", "/journey"];
const hiddenRoutes = [
  "/case-studies",
  "/case-studies/where-the-specification-lived",
  "/simulations",
  "/simulations/traffic-simulator",
  "/writing",
  "/terminal",
];

test("the root shows the scroll progress bar", () => {
  assert.equal(showsScrollProgress("/"), true);
});

test("listed routes show the bar with and without a trailing slash", () => {
  for (const route of shownRoutes) {
    for (const spelling of [route, `${route}/`, `${route}//`]) {
      assert.equal(showsScrollProgress(spelling), true, spelling);
    }
  }
});

test("other routes stay hidden with and without a trailing slash", () => {
  for (const route of hiddenRoutes) {
    for (const spelling of [route, `${route}/`]) {
      assert.equal(showsScrollProgress(spelling), false, spelling);
    }
  }
});

test("only the listed routes match, not their children or lookalikes", () => {
  for (const spelling of ["/projects/aether", "/projects-archive", "/journeys/"]) {
    assert.equal(showsScrollProgress(spelling), false, spelling);
  }
});
