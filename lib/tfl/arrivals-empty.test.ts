import assert from "node:assert/strict"
import { describe, it } from "node:test"
import type { RealtimePrediction } from "tfl-ts"
import {
  ARRIVALS_EMPTY_COPY,
  NIGHT_TUBE_LINE_IDS,
  arrivalsLineEmptyCopy,
  indexArrivalsStatusKinds,
  isLikelyRailServiceEnded,
  isLondonNightTubeMorning,
  isNightTubeLine,
  lineLikelyFinishedOvernight,
  resolveArrivalsEmptyKind,
  resolveLineArrivalsEmptyKind,
  statusKindForcesArrivalsUnavailable,
  type ArrivalsStatusSignal,
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

const SAT_0125 = londonMs(SAT_MORNING, 1, 25)

const DISTRICT_RESUME_REASON =
  "District Line: Service will resume at 06:00. Planned engineering works."

const goodService = (id: string): ArrivalsStatusSignal => ({
  id,
  lineStatuses: [
    {
      statusSeverity: 10,
      statusSeverityDescription: "Good Service",
      validityPeriods: [{ isNow: true }],
    },
  ],
})

const serviceClosed = (
  id: string,
  reason = DISTRICT_RESUME_REASON
): ArrivalsStatusSignal => ({
  id,
  lineStatuses: [
    {
      statusSeverity: 20,
      statusSeverityDescription: "Service Closed",
      reason,
      disruption: { category: "RealTime" },
      validityPeriods: [{ isNow: true }],
    },
  ],
})

const suspended = (id: string): ArrivalsStatusSignal => ({
  id,
  lineStatuses: [
    {
      statusSeverity: 2,
      statusSeverityDescription: "Suspended",
      reason: "District Line: No service due to a signal failure.",
      disruption: { category: "RealTime" },
      validityPeriods: [{ isNow: true }],
    },
  ],
})

describe("arrivals empty clock helpers", () => {
  it("does not treat 00:30 Saturday as the overnight ended window", () => {
    const nowMs = londonMs(SAT_MORNING, 0, 30)
    assert.equal(isLikelyRailServiceEnded(nowMs), false)
    assert.equal(isLondonNightTubeMorning(nowMs), false)
  })

  it("treats 01:25 Saturday as a Night Tube morning", () => {
    const nowMs = londonMs(SAT_MORNING, 1, 25)
    assert.equal(isLikelyRailServiceEnded(nowMs), true)
    assert.equal(isLondonNightTubeMorning(nowMs), true)
  })

  it("treats 01:25 Monday as overnight closed, not a Night Tube morning", () => {
    const nowMs = londonMs(MON_MORNING, 1, 25)
    assert.equal(isLikelyRailServiceEnded(nowMs), true)
    assert.equal(isLondonNightTubeMorning(nowMs), false)
  })
})

describe("Night Tube set", () => {
  it("is the five Night Tube lines, not Night Overground", () => {
    assert.deepEqual(
      [...NIGHT_TUBE_LINE_IDS],
      ["central", "jubilee", "northern", "piccadilly", "victoria"]
    )
    assert.equal(isNightTubeLine("central"), true)
    assert.equal(isNightTubeLine("victoria"), true)
    assert.equal(isNightTubeLine("jubilee"), true)
    assert.equal(isNightTubeLine("northern"), true)
    assert.equal(isNightTubeLine("piccadilly"), true)
    assert.equal(isNightTubeLine("windrush"), false)
    assert.equal(isNightTubeLine("bakerloo"), false)
    assert.equal(isNightTubeLine("district"), false)
    assert.equal(isNightTubeLine("circle"), false)
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
      nowMs: SAT_0125,
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
    assert.equal(arrivalsLineEmptyCopy(kind), ARRIVALS_EMPTY_COPY.empty)
  })

  it("marks District/Circle ended after last Friday service at 01:25 Saturday", () => {
    const kind = resolveLineArrivalsEmptyKind({
      lineIds: ["district", "circle"],
      rowCount: SUCCESS_EMPTY_ARRIVALS.length,
      nowMs: SAT_0125,
    })
    assert.equal(kind, "ended")
    assert.equal(arrivalsLineEmptyCopy(kind), ARRIVALS_EMPTY_COPY.ended)
  })

  it("does not mark a Night Tube line ended on Saturday 01:25", () => {
    const kind = resolveLineArrivalsEmptyKind({
      lineIds: ["central"],
      rowCount: 0,
      nowMs: SAT_0125,
    })
    assert.equal(kind, "empty")
    assert.equal(arrivalsLineEmptyCopy(kind), ARRIVALS_EMPTY_COPY.empty)
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

describe("status as an arrivals signal", () => {
  it("indexes validity-aware kinds and ignores reason text", () => {
    const kinds = indexArrivalsStatusKinds(
      [goodService("district"), serviceClosed("circle")],
      SAT_0125
    )
    assert.equal(kinds.district, "good")
    assert.equal(kinds.circle, "closed")
    assert.equal(statusKindForcesArrivalsUnavailable("good"), false)
    assert.equal(statusKindForcesArrivalsUnavailable("closed"), false)
    assert.equal(statusKindForcesArrivalsUnavailable("incident"), false)
  })

  it("treats successful [] + Good Service overnight as ended, not unavailable", () => {
    const kind = resolveLineArrivalsEmptyKind({
      lineIds: ["district"],
      rowCount: SUCCESS_EMPTY_ARRIVALS.length,
      nowMs: SAT_0125,
      lineStatus: [goodService("district")],
    })
    assert.equal(kind, "ended")
    assert.equal(arrivalsLineEmptyCopy(kind), ARRIVALS_EMPTY_COPY.ended)
  })

  it("keeps successful [] + Service Closed on ended and never uses the reason", () => {
    const lineStatus = [serviceClosed("district")]
    const kind = resolveLineArrivalsEmptyKind({
      lineIds: ["district"],
      rowCount: 0,
      nowMs: SAT_0125,
      lineStatus,
    })
    const copy = arrivalsLineEmptyCopy(kind)
    assert.equal(kind, "ended")
    assert.equal(copy, ARRIVALS_EMPTY_COPY.ended)
    assert.equal(copy.includes("resume"), false)
    assert.equal(copy.includes("Service Closed"), false)
    assert.equal(copy.includes("engineering"), false)
    assert.equal(JSON.stringify(lineStatus).includes("resume at 06:00"), true)
  })

  it("keeps successful [] + suspended as ended without status copy", () => {
    const kind = resolveLineArrivalsEmptyKind({
      lineIds: ["district"],
      rowCount: 0,
      nowMs: SAT_0125,
      lineStatus: [suspended("district")],
    })
    assert.equal(kind, "ended")
    assert.equal(arrivalsLineEmptyCopy(kind).includes("signal failure"), false)
  })

  it("returns null on fetch failure even when status is Service Closed", () => {
    assert.equal(
      resolveArrivalsEmptyKind({
        rowCount: 0,
        hasError: true,
        nowMs: SAT_0125,
        lineIds: ["district"],
        lineStatus: [serviceClosed("district")],
      }),
      null
    )
  })

  it("does not let one closed sibling empty a station that still has predictions", () => {
    assert.equal(
      resolveArrivalsEmptyKind({
        rowCount: 1,
        nowMs: SAT_0125,
        lineIds: ["circle", "district"],
        lineStatus: [goodService("circle"), serviceClosed("district")],
      }),
      null
    )
    assert.equal(
      resolveLineArrivalsEmptyKind({
        lineIds: ["circle"],
        rowCount: 1,
        nowMs: SAT_0125,
        lineStatus: [goodService("circle"), serviceClosed("district")],
      }),
      null
    )
    assert.equal(
      resolveLineArrivalsEmptyKind({
        lineIds: ["district"],
        rowCount: 0,
        nowMs: SAT_0125,
        lineStatus: [goodService("circle"), serviceClosed("district")],
      }),
      "ended"
    )
    assert.equal(circleStillRunning.lineId, "circle")
  })

  it("does not station-wide-end a shared merge while one member still has trains", () => {
    assert.equal(
      resolveLineArrivalsEmptyKind({
        lineIds: ["circle", "district"],
        rowCount: 1,
        nowMs: SAT_0125,
        lineStatus: [serviceClosed("district")],
      }),
      null
    )
  })
})

describe("resolveArrivalsEmptyKind aggregation", () => {
  it("returns null on fetch failure so the board can paint error", () => {
    assert.equal(
      resolveArrivalsEmptyKind({
        rowCount: 0,
        hasError: true,
        nowMs: SAT_0125,
      }),
      null
    )
  })

  it("returns null when any prediction is present", () => {
    assert.equal(
      resolveArrivalsEmptyKind({
        rowCount: 1,
        nowMs: SAT_0125,
        lineIds: ["district", "circle"],
      }),
      null
    )
  })

  it("keeps unseeded overnight rail as ended", () => {
    assert.equal(
      resolveArrivalsEmptyKind({
        rowCount: 0,
        domain: "rail",
        nowMs: SAT_0125,
      }),
      "ended"
    )
  })

  it("does not station-wide-end Oxford Circus when Night Tube lines are listed", () => {
    assert.equal(
      resolveArrivalsEmptyKind({
        rowCount: 0,
        domain: "rail",
        nowMs: SAT_0125,
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
        nowMs: SAT_0125,
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
        nowMs: SAT_0125,
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
