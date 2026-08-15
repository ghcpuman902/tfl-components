import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MAP_SEARCH_RADIUS_METERS,
  circleBounds,
  circlePolygon,
} from "./geo";

describe("circlePolygon", () => {
  it("closes the ring around the centre", () => {
    const polygon = circlePolygon(-0.128, 51.508, MAP_SEARCH_RADIUS_METERS);
    const ring = polygon.coordinates[0];
    assert.ok(ring && ring.length > 8);
    assert.deepEqual(ring[0], ring.at(-1));
  });

  it("places the north vertex ~radius metres away", () => {
    const lat = 51.508;
    const lon = -0.128;
    const polygon = circlePolygon(lon, lat, MAP_SEARCH_RADIUS_METERS, 4);
    const north = polygon.coordinates[0]?.[0];
    assert.ok(north);
    const latDeltaMeters = (north[1]! - lat) * 111_320;
    assert.ok(Math.abs(latDeltaMeters - MAP_SEARCH_RADIUS_METERS) < 2);
    assert.ok(Math.abs(north[0]! - lon) < 1e-9);
  });
});

describe("circleBounds", () => {
  it("encloses the radius in both axes", () => {
    const bounds = circleBounds(-0.128, 51.508, MAP_SEARCH_RADIUS_METERS);
    const [[west, south], [east, north]] = bounds;
    assert.ok(east > west);
    assert.ok(north > south);
  });
});
