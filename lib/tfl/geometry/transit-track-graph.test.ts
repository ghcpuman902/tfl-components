import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  TRACK_GRAPH,
  buildLineTracks,
  connectedComponentCount,
  lineLengthMetres,
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

describe("buildLineTracks", () => {
  it("merges directional twin tracks into one centreline and keeps both dual tracks", () => {
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
