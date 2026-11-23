import assert from "node:assert/strict"
import { describe, it } from "node:test"
import type { RealtimePrediction } from "tfl-ts"
import {
  boardOgLine,
  pickNextTrain,
  pickRailArrivals,
  toBusLive,
  splitStatusForOg,
  toStatusRows,
} from "@/lib/og/board-share-live-og-rows"
import type { StatusLine } from "@/lib/tfl/status-types"

const arrival = (
  lineId: string,
  seconds: number,
  destinationName: string,
  platformName?: string,
  extra: Partial<RealtimePrediction> = {}
): RealtimePrediction =>
  ({
    lineId,
    lineName: lineId,
    timeToStation: seconds,
    destinationName,
    platformName,
    ...extra,
  }) as RealtimePrediction

const status = (
  id: string,
  statusSeverity: number,
  statusSeverityDescription: string
): StatusLine =>
  ({
    id,
    name: id,
    lineStatuses: [{ statusSeverity, statusSeverityDescription }],
  }) as StatusLine

describe("pickRailArrivals (A)", () => {
  const oxfordCircus = [
    arrival("victoria", 60, "Brixton Underground Station", "Southbound - Platform 5"),
    arrival("central", 120, "Ealing Broadway Underground Station", "Westbound - Platform 1"),
    arrival("central", 200, "Epping Underground Station", "Eastbound - Platform 2"),
    arrival("central", 300, "West Ruislip Underground Station", "Westbound - Platform 1"),
    arrival("central", 480, "Ealing Broadway Underground Station", "Westbound - Platform 1"),
    arrival("central", 600, "Ealing Broadway Underground Station", "Westbound - Platform 1"),
  ]

  it("leads with the first Board line, its soonest bound, next three", () => {
    const a = pickRailArrivals(oxfordCircus, {
      lineIds: ["central", "victoria", "bakerloo"],
    })
    assert.ok(a)
    assert.equal(a.line.id, "central")
    assert.equal(a.direction, "Westbound · Platform 1")
    assert.deepEqual(a.rows, [
      { destination: "Ealing Broadway", minutes: 2 },
      { destination: "West Ruislip", minutes: 5 },
      { destination: "Ealing Broadway", minutes: 8 },
    ])
    assert.deepEqual(
      a.alsoHere.map((line) => line.id),
      ["victoria", "bakerloo"]
    )
  })

  it("honours a.priority line and bound", () => {
    const a = pickRailArrivals(oxfordCircus, {
      lineIds: ["central", "victoria"],
      priority: [{ line: "central", bound: "eastbound" }],
    })
    assert.equal(a?.direction, "Eastbound · Platform 2")
    assert.deepEqual(a?.rows, [{ destination: "Epping", minutes: 3 }])
  })

  it("returns null when no wanted line has a train", () => {
    assert.equal(
      pickRailArrivals(oxfordCircus, { lineIds: ["bakerloo"] }),
      null
    )
    assert.equal(pickRailArrivals([], { lineIds: ["central"] }), null)
  })
})

describe("toStatusRows (B)", () => {
  it("keeps Board order, sentence-cases, marks disruption as alert", () => {
    const rows = toStatusRows(
      [
        status("victoria", 9, "Minor Delays"),
        status("northern", 10, "Good Service"),
      ],
      ["northern", "victoria", "piccadilly"]
    )
    assert.deepEqual(
      rows.map((r) => [r.id, r.statusText, r.tone, r.alert]),
      [
        ["northern", "Good service", "ok", undefined],
        ["victoria", "Minor delays", "alert", "minor"],
      ]
    )
  })
})

describe("splitStatusForOg (B)", () => {
  it("details alerts and chips the rest; good chips carry no alert mark", () => {
    const rows = toStatusRows(
      [
        status("victoria", 9, "Minor Delays"),
        status("northern", 10, "Good Service"),
        status("central", 10, "Good Service"),
        status("bakerloo", 6, "Part Closure"),
      ],
      ["northern", "victoria", "central", "bakerloo"]
    )
    const { detail, chips } = splitStatusForOg(rows)
    assert.deepEqual(
      detail.map((r) => r.id),
      ["victoria", "bakerloo"]
    )
    assert.deepEqual(
      chips.map((r) => [r.id, r.tone, r.alert]),
      [
        ["northern", "ok", undefined],
        ["central", "ok", undefined],
      ]
    )
  })
})

describe("pickNextTrain (B)", () => {
  it("prefers the Board's lines, then any line", () => {
    const arrivals = [
      arrival("hammersmith-city", 60, "Barking"),
      arrival("metropolitan", 180, "Aldgate Underground Station"),
    ]
    const next = pickNextTrain(arrivals, ["metropolitan"])
    assert.equal(next?.line.id, "metropolitan")
    assert.equal(next?.destination, "Aldgate")
    assert.equal(next?.minutes, 3)
    assert.equal(pickNextTrain(arrivals, ["northern"])?.line.id, "hammersmith-city")
    assert.equal(pickNextTrain([], ["northern"]), null)
  })
})

describe("toBusLive (C)", () => {
  const stop = { stationName: "Oxford Circus" }
  const buses = [
    arrival("10", 240, "Hammersmith", "G", stop),
    arrival("94", 60, "Acton Green", "G", stop),
    arrival("73", 360, "Stoke Newington", "G", stop),
    arrival("390", 420, "Archway", "G", stop),
  ]

  it("titles with the painted stop letter and lists the next three", () => {
    const c = toBusLive(buses, { routes: [], fallbackName: "Fallback" })
    assert.equal(c?.stopName, "Oxford Circus")
    assert.equal(c?.stopLetter, "G")
    assert.deepEqual(
      c?.rows.map((r) => [r.route, r.destination, r.minutes]),
      [
        ["94", "Acton Green", 1],
        ["10", "Hammersmith", 4],
        ["73", "Stoke Newington", 6],
      ]
    )
  })

  it("filters to the Board's routes and skips arrow markers as letters", () => {
    const c = toBusLive(
      [arrival("10", 60, "Hammersmith", "->W", { stationName: "null" })],
      { routes: ["10"], fallbackName: "Oxford Circus" }
    )
    assert.equal(c?.stopName, "Oxford Circus")
    assert.equal(c?.stopLetter, null)
    assert.equal(toBusLive(buses, { routes: ["25"], fallbackName: "x" }), null)
  })
})

describe("boardOgLine (B colours)", () => {
  it("paints the Board palette, not tfl-ts getLineColor", () => {
    assert.equal(boardOgLine("piccadilly").color, "#0019A8")
    assert.equal(boardOgLine("hammersmith-city").color, "#F589A6")
    assert.equal(boardOgLine("dlr").color, "#00AFAD")
  })
})
