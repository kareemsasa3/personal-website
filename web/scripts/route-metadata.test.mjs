import test from "node:test";
import assert from "node:assert/strict";
import {
  defaultRouteMetadata,
  getRouteMetadata,
  normalizeRoutePath,
  routeMetadata,
} from "../src/data/routeMetadata.ts";
import { getStructuredDataJson } from "../src/data/structuredData.ts";

// Production nginx redirects every route with a static shell from /path to /path/, so the
// client must resolve both spellings to the same metadata or it overwrites the shell's
// correct title and canonical with the homepage's.
const nonRootRoutes = routeMetadata.filter((metadata) => metadata.path !== "/");

test("route metadata covers top-level and nested routes", () => {
  for (const path of [
    "/projects",
    "/case-studies",
    "/case-studies/where-the-specification-lived",
    "/simulations/traffic-simulator",
  ]) {
    assert.ok(nonRootRoutes.some((metadata) => metadata.path === path), path);
  }
});

test("a trailing slash resolves to the same metadata as the bare path", () => {
  for (const metadata of nonRootRoutes) {
    for (const spelling of [metadata.path, `${metadata.path}/`, `${metadata.path}//`]) {
      assert.equal(getRouteMetadata(spelling), metadata, spelling);
    }
  }
});

test("query strings and hashes do not change the metadata", () => {
  const metadata = getRouteMetadata("/case-studies/where-the-specification-lived");
  for (const spelling of [
    "/case-studies/where-the-specification-lived/?ref=x",
    "/case-studies/where-the-specification-lived#evidence",
  ]) {
    assert.equal(getRouteMetadata(spelling), metadata, spelling);
  }
});

test("the root stays the homepage, and unknown paths still fall back to it", () => {
  assert.equal(normalizeRoutePath("/"), "/");
  assert.equal(normalizeRoutePath("//"), "/");
  assert.equal(getRouteMetadata("/"), defaultRouteMetadata);
  assert.equal(getRouteMetadata("/?ref=x"), defaultRouteMetadata);
  assert.equal(defaultRouteMetadata.canonicalPath, "/");
  assert.equal(getRouteMetadata("/no-such-page/"), defaultRouteMetadata);
});

test("non-root routes never resolve to the homepage's canonical", () => {
  for (const metadata of nonRootRoutes) {
    assert.notEqual(getRouteMetadata(`${metadata.path}/`).canonicalPath, "/", metadata.path);
  }
});

test("structured data agrees for both spellings", () => {
  for (const metadata of nonRootRoutes) {
    assert.equal(
      getStructuredDataJson(`${metadata.path}/`),
      getStructuredDataJson(metadata.path),
      metadata.path
    );
  }
});
