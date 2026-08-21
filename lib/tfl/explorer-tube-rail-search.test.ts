import assert from "node:assert/strict"
import { describe, it } from "node:test"
import type { ExplorerPoint } from "./explorer-point-normalise"
import { normaliseRailPoint } from "./explorer-point-normalise"
import { getExplorerTubeRailPoints } from "./explorer/points-tube-rail"
import {
  TUBE_RAIL_LOCATE_LIMIT,
  filterExplorerTubeRailPoints,
  nearbyExplorerTubeRailPoints,
} from "./explorer-tube-rail-search"

const point = (
  partial: Pick<ExplorerPoint, "id" | "name"> & Partial<ExplorerPoint>
): ExplorerPoint => ({
  kind: "stopPoint",
  ...partial,
})

const FIXTURES: ExplorerPoint[] = [
  point({
    id: "940GZZLUADE",
    name: "Aldgate East",
    lineIds: ["hammersmith-city", "district"],
    modes: ["tube"],
    lat: 51.515,
    lon: -0.072,
  }),
  point({
    id: "940GZZLUEHM",
    name: "East Ham",
    lineIds: ["hammersmith-city", "district"],
    modes: ["tube"],
    lat: 51.539,
    lon: 0.051,
  }),
  point({
    id: "940GZZLUHSC",
    name: "Hammersmith",
    hubId: "HUBHMS",
    aliasIds: ["940GZZLUHSD"],
    hubMembers: [
      { id: "940GZZLUHSD", name: "Hammersmith", lineIds: ["district"] },
    ],
    lineIds: ["hammersmith-city", "district", "piccadilly"],
    modes: ["tube"],
    lat: 51.492,
    lon: -0.224,
  }),
  point({
    id: "940GZZLUOXC",
    name: "Oxford Circus",
    lineIds: ["victoria", "central", "bakerloo"],
    modes: ["tube"],
    lat: 51.515,
    lon: -0.142,
  }),
  point({
    id: "940GZZLUGPK",
    name: "King's Cross St. Pancras",
    lineIds: [
      "victoria",
      "northern",
      "piccadilly",
      "circle",
      "hammersmith-city",
      "metropolitan",
    ],
    modes: ["tube"],
    lat: 51.53,
    lon: -0.124,
  }),
  point({
    id: "940GZZDLTWG",
    name: "Tower Gateway",
    lineIds: ["dlr"],
    modes: ["dlr"],
    lat: 51.51,
    lon: -0.075,
  }),
  point({
    id: "940GZZLUVIC",
    name: "Victoria",
    lineIds: ["victoria", "circle", "district"],
    modes: ["tube"],
    lat: 51.496,
    lon: -0.143,
  }),
]

const names = (points: readonly ExplorerPoint[]): string[] =>
  points.map((entry) => entry.name)

describe("filterExplorerTubeRailPoints", () => {
  it("returns a copy of the catalogue when the query is empty or punctuation", () => {
    const empty = filterExplorerTubeRailPoints(FIXTURES, "  ")
    assert.deepEqual(names(empty), names(FIXTURES))
    assert.notEqual(empty, FIXTURES)
    assert.deepEqual(
      names(filterExplorerTubeRailPoints(FIXTURES, "???")),
      names(FIXTURES)
    )
  })

  it("ranks a station name above the same string in a line id", () => {
    const results = filterExplorerTubeRailPoints(FIXTURES, "Hammersmith")
    assert.equal(results[0]?.name, "Hammersmith")
    assert.ok(results.some((entry) => entry.name === "Aldgate East"))
    assert.ok(
      results.findIndex((entry) => entry.name === "Aldgate East") >
        results.findIndex((entry) => entry.name === "Hammersmith")
    )
  })

  it("is case-insensitive and trims whitespace", () => {
    const results = filterExplorerTubeRailPoints(FIXTURES, "  hammersmith  ")
    assert.equal(results[0]?.name, "Hammersmith")
  })

  it("matches names that contain the query after the station that starts with it", () => {
    const results = filterExplorerTubeRailPoints(FIXTURES, "ham")
    assert.equal(results[0]?.name, "Hammersmith")
    assert.ok(names(results).includes("East Ham"))
    assert.ok(
      results.findIndex((entry) => entry.name === "East Ham") >
        results.findIndex((entry) => entry.name === "Hammersmith")
    )
  })

  it("does not treat a single letter as a line-id substring", () => {
    const results = filterExplorerTubeRailPoints(FIXTURES, "h")
    assert.equal(results[0]?.name, "Hammersmith")
    assert.ok(!results.some((entry) => entry.name === "Aldgate East"))
  })

  it("matches H&C as the line, not as a station name", () => {
    const results = filterExplorerTubeRailPoints(FIXTURES, "H&C")
    assert.ok(results.some((entry) => entry.name === "Aldgate East"))
    assert.ok(results.some((entry) => entry.name === "Hammersmith"))
    assert.ok(!results.some((entry) => entry.name === "Oxford Circus"))
  })

  it("ranks Victoria the station above Victoria line stops", () => {
    const results = filterExplorerTubeRailPoints(FIXTURES, "victoria")
    assert.equal(results[0]?.name, "Victoria")
    assert.ok(names(results).includes("Oxford Circus"))
    assert.ok(
      results.findIndex((entry) => entry.name === "Oxford Circus") >
        results.findIndex((entry) => entry.name === "Victoria")
    )
  })

  it("matches apostrophe names without the apostrophe", () => {
    const results = filterExplorerTubeRailPoints(FIXTURES, "kings cross")
    assert.equal(results[0]?.name, "King's Cross St. Pancras")
  })

  it("matches St. Pancras without the period and as Saint", () => {
    assert.equal(
      filterExplorerTubeRailPoints(FIXTURES, "st pancras")[0]?.name,
      "King's Cross St. Pancras"
    )
    assert.equal(
      filterExplorerTubeRailPoints(FIXTURES, "saint pancras")[0]?.name,
      "King's Cross St. Pancras"
    )
  })

  it("matches naptan, alias, hub, and hub-member ids", () => {
    assert.equal(
      filterExplorerTubeRailPoints(FIXTURES, "940GZZLUHSC")[0]?.name,
      "Hammersmith"
    )
    assert.equal(
      filterExplorerTubeRailPoints(FIXTURES, "940GZZLUHSD")[0]?.name,
      "Hammersmith"
    )
    assert.equal(
      filterExplorerTubeRailPoints(FIXTURES, "HUBHMS")[0]?.name,
      "Hammersmith"
    )
  })

  it("does not treat a short digit as an id contains match", () => {
    const results = filterExplorerTubeRailPoints(FIXTURES, "9")
    assert.deepEqual(results, [])
  })

  it("matches DLR by mode without pulling tube stations", () => {
    const results = filterExplorerTubeRailPoints(FIXTURES, "dlr")
    assert.deepEqual(names(results), ["Tower Gateway"])
  })

  it("matches Elizabeth line as a mode label on the live catalogue", () => {
    const catalogue = getExplorerTubeRailPoints().map(normaliseRailPoint)
    const results = filterExplorerTubeRailPoints(catalogue, "elizabeth line")
    assert.ok(results.length > 0)
    assert.ok(results.every((entry) => entry.modes?.includes("elizabeth-line")))
  })

  it("puts Hammersmith first on the live catalogue", () => {
    const catalogue = getExplorerTubeRailPoints().map(normaliseRailPoint)
    const results = filterExplorerTubeRailPoints(catalogue, "Hammersmith")
    assert.equal(results[0]?.name, "Hammersmith")
    assert.ok(results.some((entry) => entry.name === "Aldgate East"))
  })

  it("matches live catalogue names from Saint and Road abbreviations", () => {
    const catalogue = getExplorerTubeRailPoints().map(normaliseRailPoint)
    assert.ok(
      names(filterExplorerTubeRailPoints(catalogue, "saint pauls")).includes(
        "St. Paul's"
      )
    )
    assert.ok(
      names(filterExplorerTubeRailPoints(catalogue, "finchley rd")).includes(
        "Finchley Road"
      )
    )
  })
})

describe("nearbyExplorerTubeRailPoints", () => {
  it("returns the closest stations within the radius and skips missing coords", () => {
    const origin = { lat: 51.515, lon: -0.142 }
    const results = nearbyExplorerTubeRailPoints(FIXTURES, origin, 400, 5)
    assert.equal(results[0]?.name, "Oxford Circus")
    assert.ok((results[0]?.distanceMeters ?? 999) < 50)
    assert.ok(!results.some((entry) => entry.name === "East Ham"))
  })

  it("skips points without coordinates and does not mutate the source", () => {
    const stray = point({ id: "no-geo", name: "Nowhere" })
    const source = [stray, ...FIXTURES]
    const results = nearbyExplorerTubeRailPoints(
      source,
      { lat: 51.515, lon: -0.142 },
      200,
      5
    )
    assert.ok(!results.some((entry) => entry.id === "no-geo"))
    assert.equal(stray.distanceMeters, undefined)
  })

  it("returns an empty list for an invalid origin", () => {
    assert.deepEqual(
      nearbyExplorerTubeRailPoints(FIXTURES, { lat: 999, lon: 0 }),
      []
    )
  })

  it("caps the result list", () => {
    const catalogue = getExplorerTubeRailPoints().map(normaliseRailPoint)
    const results = nearbyExplorerTubeRailPoints(
      catalogue,
      { lat: 51.507, lon: -0.128 },
      8_000
    )
    assert.ok(results.length > 0)
    assert.ok(results.length <= TUBE_RAIL_LOCATE_LIMIT)
  })
})
