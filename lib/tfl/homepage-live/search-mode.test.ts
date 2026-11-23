import assert from "node:assert/strict"
import { describe, it } from "node:test"
import type { StopRow } from "@/lib/tfl/stop-index"
import {
  nearestBusRows,
  rowsForMode,
  searchesBusStops,
} from "@/lib/tfl/homepage-live/search-mode"

const station: StopRow = { id: "940GZZLUOXC", name: "Oxford Circus", kind: "station", lines: ["central"], modes: ["tube"] }
const stop = (id: string, letter: string, lat = 51.5152, lon = -0.1416): StopRow => ({
  id,
  name: "Oxford Circus Station",
  kind: "bus",
  letter,
  lat,
  lon,
  lines: ["12"],
  modes: ["bus"],
})

describe("search mode filter", () => {
  const rows = [station, stop("490A", "RG"), stop("490B", "RC")]

  it("rail mode lists no bus stops", () => {
    assert.deepEqual(rowsForMode(rows, "rail"), [station])
    assert.equal(searchesBusStops("rail"), false)
  })

  it("bus mode lists only bus stops", () => {
    assert.deepEqual(
      rowsForMode(rows, "bus").map((row) => row.kind),
      ["bus", "bus"]
    )
    assert.equal(searchesBusStops("bus"), true)
  })

  it("dock mode lists nothing from the stop index", () => {
    assert.deepEqual(rowsForMode(rows, "cycle"), [])
  })

  it("no mode leaves the homepage list as it was", () => {
    assert.equal(rowsForMode(rows, undefined), rows)
    assert.equal(searchesBusStops(undefined), true)
  })
})

describe("nearest bus stops with an empty query", () => {
  it("lists bus stops nearest first and leaves out far ones and stations", () => {
    const all = [
      station,
      stop("490FAR", "Z", 51.53, -0.1416),
      stop("490NEAR", "RG", 51.5153, -0.1416),
      stop("490MID", "RC", 51.517, -0.1416),
    ]
    const index = {
      size: all.length,
      stationCount: 1,
      columns: {
        name: new Int32Array(all.length),
        lineSet: new Int32Array(all.length),
        lat: Int32Array.from(all, (row) => Math.round((row.lat ?? 51.5152) * 1e5)),
        lon: Int32Array.from(all, (row) => Math.round((row.lon ?? -0.1416) * 1e5)),
      },
      at: (position: number) => all[position],
    }
    const near = nearestBusRows(index, { lat: 51.5152, lon: -0.1416 })
    assert.deepEqual(
      near.map((row) => row.id),
      ["490NEAR", "490MID"]
    )
  })
})
