import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  TRACK_GRAPH,
  buildLineTracks,
  connectedComponentCount,
  lineLengthMetres,
  stripDeadEndSpurs,
  type LngLat,
} from "./transit-track-graph";

const ORIGIN_LNG = -0.12;
const ORIGIN_LAT = 51.5;
const METERS_PER_DEG_LAT = 111_320;
const METERS_PER_DEG_LNG =
  METERS_PER_DEG_LAT * Math.cos((ORIGIN_LAT * Math.PI) / 180);

const north = (metres: number): number =>
  ORIGIN_LAT + metres / METERS_PER_DEG_LAT;
const east = (metres: number): number =>
  ORIGIN_LNG + metres / METERS_PER_DEG_LNG;

const corridor = (offsetM: number, lengthM = 2000, stepM = 100): LngLat[] => {
  const points: LngLat[] = [];
  for (let metres = 0; metres <= lengthM; metres += stepM) {
    points.push([east(offsetM), north(metres)]);
  }
  return points;
};

const stations = [
  {
    id: "south",
    name: "South",
    label: "South",
    coordinates: [east(0), north(0)] as LngLat,
  },
  {
    id: "mid",
    name: "Mid",
    label: "Mid",
    coordinates: [east(0), north(1000)] as LngLat,
  },
  {
    id: "north",
    name: "North",
    label: "North",
    coordinates: [east(0), north(2000)] as LngLat,
  },
  {
    id: "east",
    name: "East",
    label: "East",
    coordinates: [east(500), north(1000)] as LngLat,
  },
];

describe("stripDeadEndSpurs", () => {
  it("drops a Bank-style terminus stub that teleports back to the junction", () => {
    const junction: LngLat = [east(0), north(1000)];
    const bank: LngLat = [east(300), north(1050)];
    const stub: LngLat[] = [
      junction,
      [east(120), north(1020)],
      [east(220), north(1040)],
      bank,
      junction,
    ];
    const main: LngLat[] = [];
    for (let metres = 80; metres <= 2200; metres += 100) {
      main.push([east(-metres), north(1000)]);
    }
    const stripped = stripDeadEndSpurs([...stub, ...main]);
    assert.equal(stripped[0], junction);
    assert.ok(
      !stripped.some(
        (point, index) =>
          index > 0 &&
          Math.hypot(
            (point[0]! - bank[0]!) * METERS_PER_DEG_LNG,
            (point[1]! - bank[1]!) * METERS_PER_DEG_LAT,
          ) < 20,
      ),
      "Bank stub must not remain on the line",
    );
    assert.ok(lineLengthMetres(stripped) > 1800);
  });
});

describe("buildLineTracks", () => {
  it("paints one direction as the centreline and keeps both dual tracks", () => {
    const spine = corridor(0);
    const twin = [...corridor(20)].reverse();
    const result = buildLineTracks({
      lineId: "test",
      lineName: "Test",
      color: "#000",
      variants: [spine, twin],
      stations,
    });

    assert.equal(result.centreline.length, 1);
    assert.equal(result.dual.length, 2);
    assert.deepEqual(
      new Set(result.dual.map((shape) => shape.trackGroup)),
      new Set([0, 1]),
    );
    assert.ok(lineLengthMetres(result.centreline[0]!) > 1800);
    assert.equal(connectedComponentCount(result.graph), 1);
  });

  it("welds a branch onto a shared spine vertex", () => {
    const spine = corridor(0);
    const twin = [...corridor(20)].reverse();
    const branch: LngLat[] = [
      [east(8), north(1000)],
      [east(120), north(1000)],
      [east(280), north(1000)],
      [east(500), north(1000)],
    ];
    const result = buildLineTracks({
      lineId: "test",
      lineName: "Test",
      color: "#000",
      variants: [spine, twin, branch],
      stations,
    });

    assert.equal(result.centreline.length, 2);
    const main = result.centreline[0]!;
    const leftover = result.centreline[1]!;
    const branchEnd = leftover[0]!;
    const shared = main.find((point) => point === branchEnd);
    assert.ok(shared, "branch must reuse a spine vertex object");
    assert.equal(connectedComponentCount(result.graph), 1);
    assert.ok(result.graph.nodes.some((node) => node.kind === "junction"));
  });

  it("welds a branch at the tangent-matched spine point, not the nearest", () => {
    // L-shaped spine: north, then east, then north again. A westbound
    // branch sits 50 m north of the east-west run, so the nearest spine
    // point is on the second northbound leg (perpendicular). The
    // tangent-matched weld is the corner, where both bearings run east-west.
    const spine: LngLat[] = [
      [east(0), north(0)],
      [east(0), north(400)],
      [east(0), north(800)],
      [east(200), north(800)],
      [east(400), north(800)],
      [east(400), north(1200)],
      [east(400), north(2000)],
    ];
    const branch: LngLat[] = [
      [east(1000), north(850)],
      [east(800), north(850)],
      [east(600), north(850)],
      [east(500), north(850)],
      [east(430), north(850)],
    ];
    const result = buildLineTracks({
      lineId: "test",
      lineName: "Test",
      color: "#000",
      variants: [spine, branch],
      stations,
    });

    assert.equal(result.centreline.length, 2);
    const leftover = result.centreline.find(
      (coords) => lineLengthMetres(coords) < 1500,
    );
    assert.ok(leftover);
    const weld = leftover[leftover.length - 1]!;
    const corner: LngLat = [east(400), north(800)];
    const nearestWrong: LngLat = [east(400), north(850)];
    const toCorner = Math.hypot(
      (weld[0]! - corner[0]!) * METERS_PER_DEG_LNG,
      (weld[1]! - corner[1]!) * METERS_PER_DEG_LAT,
    );
    const toWrong = Math.hypot(
      (weld[0]! - nearestWrong[0]!) * METERS_PER_DEG_LNG,
      (weld[1]! - nearestWrong[1]!) * METERS_PER_DEG_LAT,
    );
    assert.ok(
      toCorner < toWrong,
      `weld should sit at the east-west corner, not the perpendicular northbound point (corner ${toCorner.toFixed(1)} m, nearest ${toWrong.toFixed(1)} m)`,
    );
    assert.ok(toCorner < 40, `weld should land near the corner, got ${toCorner.toFixed(1)} m`);
  });

  it("does not add the opposite direction as a second centreline stroke", () => {
    const spine = corridor(0);
    const opposite = [...corridor(160)].reverse();
    const result = buildLineTracks({
      lineId: "test",
      lineName: "Test",
      color: "#000",
      variants: [spine, opposite],
      stations,
    });

    assert.equal(result.centreline.length, 1);
    assert.equal(result.dual.length, 2);
    assert.ok(lineLengthMetres(result.centreline[0]!) > 1800);
  });

  it("drops an 80 m rejoining wobble instead of emitting a stub", () => {
    const spine = corridor(0);
    const twin = [...corridor(20)].reverse();
    const wobble: LngLat[] = corridor(0).map((point, index) => {
      if (index >= 6 && index <= 14) return [east(80), point[1]];
      return [east(5), point[1]];
    });
    const result = buildLineTracks({
      lineId: "test",
      lineName: "Test",
      color: "#000",
      variants: [spine, twin, wobble],
      stations,
    });

    assert.equal(result.centreline.length, 1);
    assert.ok(
      result.centreline.every(
        (coords) => lineLengthMetres(coords) >= TRACK_GRAPH.MIN_RUN_M,
      ),
    );
  });
});
