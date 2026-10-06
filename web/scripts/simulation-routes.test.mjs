import test from "node:test";
import assert from "node:assert/strict";
import { isSimulationDetailRoute } from "../src/data/navigation.ts";
import { simulationsData } from "../src/data/simulationsData.ts";

// Production nginx redirects /simulations to /simulations/. The index must keep the full
// dock in both spellings; only a simulation's own page collapses it.
const detailRoutes = simulationsData.map((simulation) => simulation.path);

test("the registry lists simulation detail routes", () => {
  assert.ok(detailRoutes.includes("/simulations/traffic-simulator"));
  for (const path of detailRoutes) assert.match(path, /^\/simulations\/[^/]+$/, path);
});

test("the simulations index is not a detail route in either spelling", () => {
  for (const spelling of ["/simulations", "/simulations/", "/simulations//"]) {
    assert.equal(isSimulationDetailRoute(spelling), false, spelling);
  }
});

test("every simulation's page is a detail route with and without a trailing slash", () => {
  for (const path of detailRoutes) {
    for (const spelling of [path, `${path}/`]) {
      assert.equal(isSimulationDetailRoute(spelling), true, spelling);
    }
  }
});

test("other routes are not detail routes", () => {
  for (const spelling of ["/", "/projects/", "/case-studies/where-the-specification-lived/", "/simulationsx/", "/writing/simulations/"]) {
    assert.equal(isSimulationDetailRoute(spelling), false, spelling);
  }
});
