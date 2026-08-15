import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MAP_SEARCH_RADIUS_METERS,
  circleBounds,
  circlePolygon,
  distanceMeters,
  fractionOutsideCircle,
  pointsCentroid,
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

describe("distanceMeters", () => {
  it("is ~0 at the same point", () => {
    assert.ok(distanceMeters(51.508, -0.128, 51.508, -0.128) < 0.01);
  });
});

describe("pointsCentroid", () => {
  it("averages located points", () => {
    const centre = pointsCentroid([
      { lat: 51.5, lon: -0.12 },
      { lat: 51.51, lon: -0.14 },
      {},
    ]);
    assert.ok(centre);
    assert.ok(Math.abs(centre.lat - 51.505) < 1e-10);
    assert.equal(centre.lon, -0.13);
  });

  it("returns null without coordinates", () => {
    assert.equal(pointsCentroid([{}]), null);
  });
});

describe("fractionOutsideCircle", () => {
  const circle = { lat: 51.508, lon: -0.128, radiusMeters: 400 };

  it("is 0 when every sample is inside", () => {
    assert.equal(
      fractionOutsideCircle(
        [
          { lat: 51.508, lon: -0.128 },
          { lat: 51.5082, lon: -0.128 },
        ],
        circle,
      ),
      0,
    );
  });

  it("is 1 when every sample is well outside", () => {
    assert.equal(
      fractionOutsideCircle([{ lat: 51.53, lon: -0.08 }], circle),
      1,
    );
  });

  it("reports the share outside", () => {
    assert.equal(
      fractionOutsideCircle(
        [
          { lat: 51.508, lon: -0.128 },
          { lat: 51.53, lon: -0.08 },
        ],
        circle,
      ),
      0.5,
    );
  });
});
