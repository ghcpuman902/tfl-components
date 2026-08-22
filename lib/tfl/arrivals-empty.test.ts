import assert from "node:assert/strict"
import { describe, it } from "node:test"
import type { RealtimePrediction } from "tfl-ts"
import {
  ARRIVALS_EMPTY_COPY,
  ARRIVALS_LINE_EMPTY_COPY,
  arrivalsLineEmptyCopy,
  isLikelyRailServiceEnded,
  isLondonNightServiceMorning,
  lineHasNightServiceType,
  lineLikelyFinishedOvernight,
  resolveArrivalsEmptyKind,
  resolveLineArrivalsEmptyKind,
} from "@/lib/tfl/arrivals-empty"
import { londonDayStartMs } from "@/lib/tfl/london-dates"

/**
 * HTTP 200 from `stopPoint.getArrivals` after the last train — a valid empty
 * list, not an error and not a disruption payload.
 */
const SUCCESS_EMPTY_ARRIVALS: readonly RealtimePrediction[] = []

const circleStillRunning: RealtimePrediction = {
  id: "circle-e-1",
  lineId: "circle",
  lineName: "Circle",
  modeName: "tube",
  platformName: "Eastbound - Platform 1",
  towards: "Edgware Road (Circle)",
  timeToStation: 180,
} as RealtimePrediction

/** Europe/London wall time on an explicit calendar day (DST-safe). */
const londonMs = (dateKey: string, hour: number, minute = 0): number =>
  londonDayStartMs(dateKey) + hour * 3_600_000 + minute * 60_000

const FRI_NIGHT = "2026-08-21"
const SAT_MORNING = "2026-08-22"
const SUN_MORNING = "2026-08-23"
const MON_MORNING = "2026-08-24"

describe("arrivals empty clock helpers", () => {
  it("does not treat 00:30 Saturday as the overnight ended window", () => {
    const nowMs = londonMs(SAT_MORNING, 0, 30)
    assert.equal(isLikelyRailServiceEnded(nowMs), false)
    assert.equal(isLondonNightServiceMorning(nowMs), false)
  })

  it("treats 01:25 Saturday as a Night Tube morning", () => {
    const nowMs = londonMs(SAT_MORNING, 1, 25)
    assert.equal(isLikelyRailServiceEnded(nowMs), true)
    assert.equal(isLondonNightServiceMorning(nowMs), true)
  })

  it("treats 01:25 Monday as overnight closed, not a Night Tube morning", () => {
    const nowMs = londonMs(MON_MORNING, 1, 25)
    assert.equal(isLikelyRailServiceEnded(nowMs), true)
    assert.equal(isLondonNightServiceMorning(nowMs), false)
  })
})

describe("night service catalogue", () => {
  it("reads Night service types from the static line catalogue", () => {
    assert.equal(lineHasNightServiceType("central"), true)
    assert.equal(lineHasNightServiceType("victoria"), true)
    assert.equal(lineHasNightServiceType("jubilee"), true)
    assert.equal(lineHasNightServiceType("windrush"), true)
    assert.equal(lineHasNightServiceType("bakerloo"), false)
    assert.equal(lineHasNightServiceType("district"), false)
    assert.equal(lineHasNightServiceType("circle"), false)
  })

  it("keeps Night Tube running on Saturday 01:25 and finished on Monday 01:25", () => {
    const saturday = londonMs(SAT_MORNING, 1, 25)
    const monday = londonMs(MON_MORNING, 1, 25)
    assert.equal(lineLikelyFinishedOvernight("central", saturday), false)
    assert.equal(lineLikelyFinishedOvernight("bakerloo", saturday), true)
    assert.equal(lineLikelyFinishedOvernight("central", monday), true)
    assert.equal(lineLikelyFinishedOvernight("district", saturday), true)
  })
})

describe("resolveLineArrivalsEmptyKind", () => {
  it("returns null when the line still has predictions", () => {
    const kind = resolveLineArrivalsEmptyKind({
      lineIds: ["district"],
      rowCount: 1,
      nowMs: londonMs(SAT_MORNING, 1, 25),
    })
    assert.equal(kind, null)
  })

  it("keeps daytime successful empty as empty, not ended", () => {
    const kind = resolveLineArrivalsEmptyKind({
      lineIds: ["district"],
      rowCount: SUCCESS_EMPTY_ARRIVALS.length,
      nowMs: londonMs(SAT_MORNING, 12, 0),
    })
    assert.equal(kind, "empty")
    assert.equal(arrivalsLineEmptyCopy(kind), ARRIVALS_LINE_EMPTY_COPY)
  })

  it("marks District/Circle ended after last Friday service at 01:25 Saturday", () => {
    const kind = resolveLineArrivalsEmptyKind({
      lineIds: ["district", "circle"],
      rowCount: SUCCESS_EMPTY_ARRIVALS.length,
      nowMs: londonMs(SAT_MORNING, 1, 25),
    })
    assert.equal(kind, "ended")
    assert.equal(arrivalsLineEmptyCopy(kind), ARRIVALS_EMPTY_COPY.ended)
  })

  it("does not mark a Night Tube line ended on Saturday 01:25", () => {
    const kind = resolveLineArrivalsEmptyKind({
      lineIds: ["central"],
      rowCount: 0,
      nowMs: londonMs(SAT_MORNING, 1, 25),
    })
    assert.equal(kind, "empty")
  })

  it("marks Central ended on Monday 01:25 (no Sunday-night Night Tube)", () => {
    const kind = resolveLineArrivalsEmptyKind({
      lineIds: ["central"],
      rowCount: 0,
      nowMs: londonMs(MON_MORNING, 1, 25),
    })
    assert.equal(kind, "ended")
  })

  it("refuses ended without an explicit clock", () => {
    const kind = resolveLineArrivalsEmptyKind({
      lineIds: ["district"],
      rowCount: 0,
    })
    assert.equal(kind, "empty")
  })

  it("keeps Friday 23:30 as empty (last trains may still be due)", () => {
    const kind = resolveLineArrivalsEmptyKind({
      lineIds: ["district"],
      rowCount: 0,
      nowMs: londonMs(FRI_NIGHT, 23, 30),
    })
    assert.equal(kind, "empty")
    assert.equal(isLikelyRailServiceEnded(londonMs(FRI_NIGHT, 23, 30)), false)
  })

  it("treats Sunday 01:25 as a Night Tube morning for Central", () => {
    const kind = resolveLineArrivalsEmptyKind({
      lineIds: ["central"],
      rowCount: 0,
      nowMs: londonMs(SUN_MORNING, 1, 25),
    })
    assert.equal(kind, "empty")
  })
})

describe("resolveArrivalsEmptyKind aggregation", () => {
  it("returns null on fetch failure so the board can paint error", () => {
    assert.equal(
      resolveArrivalsEmptyKind({
        rowCount: 0,
        hasError: true,
        nowMs: londonMs(SAT_MORNING, 1, 25),
      }),
      null
    )
  })

  it("returns null when any prediction is present", () => {
    assert.equal(
      resolveArrivalsEmptyKind({
        rowCount: 1,
        nowMs: londonMs(SAT_MORNING, 1, 25),
        lineIds: ["district", "circle"],
      }),
      null
    )
    assert.equal(circleStillRunning.lineId, "circle")
  })

  it("keeps unseeded overnight rail as ended", () => {
    assert.equal(
      resolveArrivalsEmptyKind({
        rowCount: 0,
        domain: "rail",
        nowMs: londonMs(SAT_MORNING, 1, 25),
      }),
      "ended"
    )
  })

  it("does not station-wide-end Oxford Circus when Night Tube lines are listed", () => {
    assert.equal(
      resolveArrivalsEmptyKind({
        rowCount: 0,
        domain: "rail",
        nowMs: londonMs(SAT_MORNING, 1, 25),
        lineIds: ["bakerloo", "central", "victoria"],
      }),
      "empty"
    )
  })

  it("ends Tower Hill when District and Circle are both finished", () => {
    assert.equal(
      resolveArrivalsEmptyKind({
        rowCount: 0,
        domain: "rail",
        nowMs: londonMs(SAT_MORNING, 1, 25),
        lineIds: ["district", "circle"],
      }),
      "ended"
    )
  })

  it("does not use ended for bus in the overnight window", () => {
    assert.equal(
      resolveArrivalsEmptyKind({
        rowCount: 0,
        domain: "bus",
        nowMs: londonMs(SAT_MORNING, 1, 25),
      }),
      "empty"
    )
  })

  it("uses offline when the caller says the client is offline", () => {
    assert.equal(
      resolveArrivalsEmptyKind({
        rowCount: 0,
        offline: true,
        nowMs: londonMs(SAT_MORNING, 12, 0),
      }),
      "offline"
    )
  })
})
