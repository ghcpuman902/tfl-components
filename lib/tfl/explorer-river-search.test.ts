import assert from "node:assert/strict"
import { describe, it } from "node:test"
import type { ExplorerPoint } from "./explorer-point-normalise"
import {
  RIVER_LOCATE_LIMIT,
  filterExplorerRiverPoints,
  nearbyExplorerRiverPoints,
} from "./explorer-river-search"

const point = (
  partial: Pick<ExplorerPoint, "id" | "name"> & Partial<ExplorerPoint>
): ExplorerPoint => ({
  kind: "stopPoint",
  modes: ["river-bus"],
  ...partial,
})

const FIXTURES: ExplorerPoint[] = [
  point({
    id: "930GWMR",
    name: "Westminster Pier",
    lineIds: ["rb1", "rb6"],
    lat: 51.501,
    lon: -0.123,
  }),
  point({
    id: "930GEMB",
    name: "Embankment Pier",
    lineIds: ["rb1", "rb6"],
    lat: 51.507,
    lon: -0.122,
  }),
  point({
    id: "930GWWC",
    name: "Woolwich Ferry North Pier",
    lineIds: ["woolwich-ferry"],
    lat: 51.497,
    lon: 0.062,
  }),
]

const names = (points: readonly ExplorerPoint[]) =>
  points.map((item) => item.name)

describe("filterExplorerRiverPoints", () => {
  it("returns the full catalogue for an empty query", () => {
    assert.deepEqual(
      names(filterExplorerRiverPoints(FIXTURES, "  ")),
      names(FIXTURES)
    )
  })

  it("matches pier names as you type", () => {
    assert.deepEqual(names(filterExplorerRiverPoints(FIXTURES, "west")), [
      "Westminster Pier",
    ])
  })

  it("matches river line ids", () => {
    assert.deepEqual(names(filterExplorerRiverPoints(FIXTURES, "rb1")), [
      "Embankment Pier",
      "Westminster Pier",
    ])
  })

  it("matches Woolwich Ferry by line name", () => {
    assert.equal(
      filterExplorerRiverPoints(FIXTURES, "woolwich ferry")[0]?.name,
      "Woolwich Ferry North Pier"
    )
  })
})

describe("nearbyExplorerRiverPoints", () => {
  it("ranks cached piers by distance without calling TfL", () => {
    const origin = { lat: 51.501, lon: -0.123 }
    const results = nearbyExplorerRiverPoints(FIXTURES, origin, 800, 5)
    assert.equal(results[0]?.name, "Westminster Pier")
    assert.ok((results[0]?.distanceMeters ?? 999) < 50)
    assert.ok(results.some((item) => item.name === "Embankment Pier"))
    assert.ok(!results.some((item) => item.name.includes("Woolwich")))
  })

  it("uses the wider river radius for sparse piers", () => {
    const origin = { lat: 51.501, lon: -0.123 }
    const tight = nearbyExplorerRiverPoints(FIXTURES, origin, 100, 5)
    const wide = nearbyExplorerRiverPoints(FIXTURES, origin)
    assert.ok(tight.length <= wide.length)
    assert.ok(wide.length <= RIVER_LOCATE_LIMIT)
  })
})
