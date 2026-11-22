import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import type { RealtimePrediction } from "tfl-ts"
import { BusArrivalsBoard } from "@/components/tfl/arrivals/bus-arrivals-board"
import { RailArrivalsBoard } from "@/components/tfl/arrivals/rail-arrivals-board"
import {
  busArrivalsFromRows,
  homepageServingLines,
  stationArrivalsFromSnapshot,
} from "@/lib/tfl/homepage-live/board-arrivals"
import { compactRound } from "@/lib/tfl/homepage-live/compact"
import { replayArrivalsRound } from "@/lib/tfl/homepage-live/fixture"
import { computeFrame } from "@/lib/tfl/homepage-live/replay-frame"
import { replayRoundsFor } from "@/lib/tfl/homepage-live/replay-params"

const AT = Date.parse("2026-11-18T15:00:00Z")
const row = (fields: Partial<RealtimePrediction> & { etaSec: number }): RealtimePrediction => {
  const { etaSec, ...rest } = fields
  return {
    lineId: "victoria",
    naptanId: "940GZZLUKSX",
    platformName: "Northbound - Platform 3",
    destinationName: "Walthamstow Central Underground Station",
    expectedArrival: new Date(AT + etaSec * 1000).toISOString(),
    timeToStation: etaSec,
    ...rest,
  } as RealtimePrediction
}

describe("station arrivals from the network snapshot", () => {
  const rows = [
    row({ etaSec: 120, vehicleId: "201" }),
    row({ etaSec: -10, vehicleId: "202" }),
    row({ etaSec: -60, vehicleId: "203" }),
    row({ etaSec: 300, naptanId: "940GZZLUOXC", vehicleId: "204" }),
    row({ etaSec: 90, lineId: undefined }),
  ]

  it("keeps this station's rows, drops other stations and trains that have left", () => {
    const out = stationArrivalsFromSnapshot({ rows, stopIds: ["940GZZLUKSX"], receivedAt: AT })
    assert.deepEqual(
      out.map((r) => r.vehicleId),
      ["201", "202"]
    )
  })

  it("counts timeToStation down by the poll's age, never below zero", () => {
    const out = stationArrivalsFromSnapshot({ rows, stopIds: ["940GZZLUKSX"], receivedAt: AT, ageSec: 60 })
    assert.equal(out.find((r) => r.vehicleId === "201")?.timeToStation, 60)
    assert.equal(out.find((r) => r.vehicleId === "202"), undefined)
    const early = stationArrivalsFromSnapshot({ rows, stopIds: ["940GZZLUKSX"], receivedAt: AT })
    assert.equal(early.find((r) => r.vehicleId === "202")?.timeToStation, 0)
  })

  it("names the station on every row and keeps the RealtimePrediction fields", () => {
    const [first] = stationArrivalsFromSnapshot({
      rows,
      stopIds: ["940GZZLUKSX"],
      receivedAt: AT,
      stationName: "King's Cross St. Pancras",
    })
    assert.equal(first?.stationName, "King's Cross St. Pancras")
    assert.equal(first?.platformName, "Northbound - Platform 3")
    assert.equal(first?.lineId, "victoria")
  })
})

describe("serving lines the homepage can fill", () => {
  it("drops lines the network poll does not carry", () => {
    const kept = homepageServingLines([
      { lineId: "victoria", lineName: "Victoria" },
      { lineId: "thameslink", lineName: "Thameslink" },
    ])
    assert.deepEqual(kept?.map((l) => l.lineId), ["victoria"])
    assert.equal(homepageServingLines([{ lineId: "thameslink", lineName: "Thameslink" }]), undefined)
    assert.equal(homepageServingLines(undefined), undefined)
  })
})

describe("bus rows as Board predictions", () => {
  it("maps route, destination, ETA and stop", () => {
    const [p] = busArrivalsFromRows({
      rows: [{ route: "N205", destination: "Bow Church", etaSec: 240, vehicleId: "BX1", towards: "Angel" }],
      stopId: "490000129E",
      stopName: "King's Cross Station",
      stopLetter: "E",
      at: AT,
    })
    assert.equal(p?.lineId, "n205")
    assert.equal(p?.lineName, "N205")
    assert.equal(p?.destinationName, "Bow Church")
    assert.equal(p?.timeToStation, 240)
    assert.equal(p?.expectedArrival, new Date(AT + 240_000).toISOString())
    assert.equal(p?.naptanId, "490000129E")
    assert.equal(p?.stationName, "King's Cross Station")
    assert.equal(p?.vehicleId, "BX1")
  })

  it("renders through the live BusArrivalsBoard", () => {
    const data = busArrivalsFromRows({
      rows: [
        { route: "205", destination: "Bow Church", etaSec: 20, vehicleId: "A" },
        { route: "73", destination: "Oxford Circus", etaSec: 240, vehicleId: "B" },
      ],
      stopId: "490000129E",
      stopName: "King's Cross Station",
      stopLetter: "E",
      at: AT,
    })
    const html = renderToStaticMarkup(
      createElement(BusArrivalsBoard, { data, stopName: "King's Cross Station", stopLetter: "E", groupBy: "route" })
    )
    assert.ok(html.includes('data-slot="arrivals-board"'))
    assert.ok(html.includes("Bow Church"))
    assert.ok(html.includes("Oxford Circus"))
  })
})

describe("King's Cross from the recorded network poll, on the live RailArrivalsBoard", () => {
  const frame = computeFrame(
    replayRoundsFor({ fixture: "kx", round: 10 }).map((i) => {
      const recorded = replayArrivalsRound(i)
      return compactRound(recorded.rows, recorded.receivedAt)
    })
  )
  const data = stationArrivalsFromSnapshot({
    rows: frame.rows,
    stopIds: ["940GZZLUKSX"],
    receivedAt: frame.receivedAt,
    stationName: "King's Cross St. Pancras",
  })

  it("has rows for the Tube lines at King's Cross", () => {
    const lines = new Set(data.map((r) => r.lineId))
    for (const line of ["victoria", "piccadilly", "northern"]) assert.ok(lines.has(line), line)
  })

  it("renders as the Board does, with no homepage-only marks", () => {
    const html = renderToStaticMarkup(
      createElement(RailArrivalsBoard, {
        stopName: "King's Cross St. Pancras",
        stopPointId: "940GZZLUKSX",
        headingLevel: 2,
        data,
        now: frame.receivedAt,
      })
    )
    assert.ok(html.includes('data-slot="arrivals-board"'))
    assert.ok(html.includes('data-slot="arrivals-row"'))
    assert.ok(!html.includes(">Beta<"))
  })
})
