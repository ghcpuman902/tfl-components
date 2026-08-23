import assert from "node:assert/strict"
import { describe, it } from "node:test"
import type { RealtimePrediction } from "tfl-ts"
import {
  ARRIVALS_EMPTY_COPY,
  ARRIVALS_LEFTOVER_SENTENCE,
  NIGHT_TUBE_LINE_IDS,
  arrivalsLineEmptyCopy,
  formatLondonClockTime,
  indexArrivalsStatusKinds,
  isCurrentArrivalsDisruption,
  isLikelyRailServiceEnded,
  isLondonNightTubeMorning,
  isNightTubeLine,
  lineLikelyFinishedOvernight,
  overlappingValidityToDateMs,
  resolveArrivalsEmptyKind,
  resolveArrivalsLeftoverStatus,
  resolveArrivalsStatusChip,
  resolveLineArrivalsEmptyKind,
  stationIdentityIdsForStop,
  statusAffectsStation,
  statusKindForcesArrivalsUnavailable,
  type ArrivalsEmptyState,
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
const SAT_0836 = londonMs(SAT_MORNING, 8, 36)
const SAT_2200 = londonMs(SAT_MORNING, 22)
const SUN_2222 = londonMs(SUN_MORNING, 22, 22)

const KINGS_CROSS = "940GZZLUKSX"
const HYDE_PARK_CORNER = "940GZZLUHPC"
const ACTON_TOWN = "940GZZLUACT"
const PARSONS_GREEN = "940GZZLUPSG"

const kindOf = (state: ArrivalsEmptyState | null): string | null =>
  state?.kind ?? null

/**
 * Trimmed live GET /Line/circle,district/Status on Saturday 22 Aug 2026.
 * `isNow` is false; the clock overlap is 03:30Z–09:30Z.
 */
const CIRCLE_PLANNED_REASON =
  "CIRCLE LINE: Saturday 22 August, until 1030, no service on the entire line."
const DISTRICT_PART_REASON =
  "DISTRICT LINE: Saturday 22 August, until 1030, no service. Replacement buses operate."
const LYING_REASON = "CIRCLE LINE: Saturday 22 August, until 1500, no service."

const saturdayEngineeringWindow = {
  fromDate: "2026-08-22T03:30:00Z",
  toDate: "2026-08-22T09:30:00Z",
  isNow: false as const,
}

const circlePlannedClosure = (
  reason = CIRCLE_PLANNED_REASON
): ArrivalsStatusSignal => ({
  id: "circle",
  lineStatuses: [
    {
      statusSeverity: 4,
      statusSeverityDescription: "Planned Closure",
      reason,
      disruption: {
        category: "PlannedWork",
        closureText: "plannedClosure",
      },
      validityPeriods: [saturdayEngineeringWindow],
    },
  ],
})

const districtPartClosure = (
  reason = DISTRICT_PART_REASON,
  toDate = saturdayEngineeringWindow.toDate
): ArrivalsStatusSignal => ({
  id: "district",
  lineStatuses: [
    {
      statusSeverity: 5,
      statusSeverityDescription: "Part Closure",
      reason,
      disruption: {
        category: "PlannedWork",
        closureText: "partClosure",
      },
      validityPeriods: [
        {
          ...saturdayEngineeringWindow,
          toDate,
        },
      ],
    },
  ],
})

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

const minorDelays = (id: string): ArrivalsStatusSignal => ({
  id,
  lineStatuses: [
    {
      statusSeverity: 9,
      statusSeverityDescription: "Minor Delays",
      reason: "District Line: Minor delays due to an earlier signal failure.",
      disruption: { category: "RealTime" },
      validityPeriods: [{ isNow: true }],
    },
  ],
})

const serviceClosed = (
  id: string,
  reason = "District Line: Service will resume at 06:00. Planned engineering works."
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

const severeDelays = (id: string): ArrivalsStatusSignal => ({
  id,
  lineStatuses: [
    {
      statusSeverity: 6,
      statusSeverityDescription: "Severe Delays",
      reason: "Central Line: Severe delays due to an earlier signal failure.",
      disruption: { category: "RealTime" },
      validityPeriods: [{ isNow: true }],
    },
  ],
})

/** Live Saturday Piccadilly part closure: Hyde Park Corner–Acton Town only. */
const piccadillyPartClosure = (): ArrivalsStatusSignal => ({
  id: "piccadilly",
  lineStatuses: [
    {
      statusSeverity: 5,
      statusSeverityDescription: "Part Closure",
      reason:
        "PICCADILLY LINE: Saturday 22 August, between 0445 and 1400, no service between Hyde Park Corner and Acton Town. Replacement bus services operate.",
      disruption: {
        category: "PlannedWork",
        closureText: "partClosure",
        affectedStops: [
          { naptanId: HYDE_PARK_CORNER },
          { naptanId: ACTON_TOWN },
        ],
        affectedRoutes: [
          {
            isEntireRouteSection: false,
            routeSectionNaptanEntrySequence: [
              { stopPoint: { naptanId: HYDE_PARK_CORNER } },
              { stopPoint: { naptanId: ACTON_TOWN } },
            ],
          },
        ],
      },
      validityPeriods: [
        {
          fromDate: "2026-08-22T03:45:00Z",
          toDate: "2026-08-22T13:00:00Z",
          isNow: false,
        },
      ],
    },
  ],
})

/**
 * Live Sunday District Wimbledon branch: one union window Sat 14:00 → Mon 01:29.
 * 01:29 is the traffic-day end, not the next train.
 */
const districtWeekendWimbledonUnion = (): ArrivalsStatusSignal => ({
  id: "district",
  lineStatuses: [
    {
      statusSeverity: 5,
      statusSeverityDescription: "Part Closure",
      reason:
        "DISTRICT LINE: Saturday 22 August, from 1400, and all day Sunday 23 August, no service between Fulham Broadway and Wimbledon.",
      disruption: {
        category: "PlannedWork",
        closureText: "partClosure",
        affectedStops: [{ naptanId: PARSONS_GREEN }],
      },
      validityPeriods: [
        {
          fromDate: "2026-08-22T13:00:00Z",
          toDate: "2026-08-24T00:29:00Z",
          isNow: false,
        },
      ],
    },
  ],
})

/** Same possession split across the overnight gap — do not resume at Sunday 01:29. */
const districtWeekendWimbledonSplit = (): ArrivalsStatusSignal => ({
  id: "district",
  lineStatuses: [
    {
      statusSeverity: 5,
      statusSeverityDescription: "Part Closure",
      reason:
        "DISTRICT LINE: Saturday 22 August, from 1400, and all day Sunday 23 August, no service between Fulham Broadway and Wimbledon.",
      disruption: {
        category: "PlannedWork",
        closureText: "partClosure",
        affectedStops: [{ naptanId: PARSONS_GREEN }],
      },
      validityPeriods: [
        {
          fromDate: "2026-08-22T13:00:00Z",
          toDate: "2026-08-23T00:29:00Z",
          isNow: false,
        },
        {
          fromDate: "2026-08-23T04:30:00Z",
          toDate: "2026-08-24T00:29:00Z",
          isNow: false,
        },
      ],
    },
  ],
})

const victoriaLineWideDelays = (): ArrivalsStatusSignal => ({
  id: "victoria",
  lineStatuses: [
    {
      statusSeverity: 9,
      statusSeverityDescription: "Minor Delays",
      reason: "Victoria Line: Minor delays due to train cancellations.",
      disruption: {
        category: "RealTime",
        closureText: "minorDelays",
        affectedRoutes: [{ isEntireRouteSection: true }],
      },
      validityPeriods: [{ isNow: true }],
    },
  ],
})

/**
 * Trimmed live Saturday W&C Planned Closure. `Information` + toDate 22:59Z
 * is the notice end, not the next train.
 */
const waterlooCitySaturdayTimetable = (): ArrivalsStatusSignal => ({
  id: "waterloo-city",
  lineStatuses: [
    {
      statusSeverity: 4,
      statusSeverityDescription: "Planned Closure",
      reason:
        "WATERLOO & CITY LINE: Saturday 22 August, no service. This line does not operate on Saturdays.",
      disruption: {
        category: "Information",
        closureText: "plannedClosure",
      },
      validityPeriods: [
        {
          fromDate: "2026-08-22T03:15:00Z",
          toDate: "2026-08-22T22:59:00Z",
          isNow: false,
        },
      ],
    },
  ],
})

/**
 * Trimmed live Windrush dual row. Part Suspended RealTime toDate is a
 * sliding expiry, not a resume clock.
 */
const windrushPartSuspended = (): ArrivalsStatusSignal => ({
  id: "windrush",
  lineStatuses: [
    {
      statusSeverity: 3,
      statusSeverityDescription: "Part Suspended",
      reason:
        "WINDRUSH LINE: No service between New Cross Gate and Crystal Palace / West Croydon.",
      disruption: { category: "RealTime" },
      validityPeriods: [
        {
          fromDate: "2026-08-22T06:12:00Z",
          toDate: "2026-08-22T11:40:00Z",
          isNow: true,
        },
      ],
    },
    {
      statusSeverity: 9,
      statusSeverityDescription: "Minor Delays",
      reason: "WINDRUSH LINE: Minor delays due to an earlier signal failure.",
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
    const state = resolveLineArrivalsEmptyKind({
      lineIds: ["district"],
      rowCount: 1,
      nowMs: SAT_0125,
    })
    assert.equal(state, null)
  })

  it("keeps daytime successful empty as empty, not ended", () => {
    const state = resolveLineArrivalsEmptyKind({
      lineIds: ["district"],
      rowCount: SUCCESS_EMPTY_ARRIVALS.length,
      nowMs: londonMs(SAT_MORNING, 12, 0),
    })
    assert.equal(kindOf(state), "empty")
    assert.equal(arrivalsLineEmptyCopy(state), ARRIVALS_EMPTY_COPY.empty)
  })

  it("marks District/Circle ended after last Friday service at 01:25 Saturday", () => {
    const state = resolveLineArrivalsEmptyKind({
      lineIds: ["district", "circle"],
      rowCount: SUCCESS_EMPTY_ARRIVALS.length,
      nowMs: SAT_0125,
    })
    assert.equal(kindOf(state), "ended")
    assert.equal(arrivalsLineEmptyCopy(state), ARRIVALS_EMPTY_COPY.ended)
  })

  it("does not mark a Night Tube line ended on Saturday 01:25", () => {
    const state = resolveLineArrivalsEmptyKind({
      lineIds: ["central"],
      rowCount: 0,
      nowMs: SAT_0125,
    })
    assert.equal(kindOf(state), "empty")
    assert.equal(arrivalsLineEmptyCopy(state), ARRIVALS_EMPTY_COPY.empty)
  })

  it("marks Central ended on Monday 01:25 (no Sunday-night Night Tube)", () => {
    const state = resolveLineArrivalsEmptyKind({
      lineIds: ["central"],
      rowCount: 0,
      nowMs: londonMs(MON_MORNING, 1, 25),
    })
    assert.equal(kindOf(state), "ended")
  })

  it("refuses ended without an explicit clock", () => {
    const state = resolveLineArrivalsEmptyKind({
      lineIds: ["district"],
      rowCount: 0,
    })
    assert.equal(kindOf(state), "empty")
  })

  it("keeps Friday 23:30 as empty (last trains may still be due)", () => {
    const state = resolveLineArrivalsEmptyKind({
      lineIds: ["district"],
      rowCount: 0,
      nowMs: londonMs(FRI_NIGHT, 23, 30),
    })
    assert.equal(kindOf(state), "empty")
    assert.equal(isLikelyRailServiceEnded(londonMs(FRI_NIGHT, 23, 30)), false)
  })

  it("treats Sunday 01:25 as a Night Tube morning for Central", () => {
    const state = resolveLineArrivalsEmptyKind({
      lineIds: ["central"],
      rowCount: 0,
      nowMs: londonMs(SUN_MORNING, 1, 25),
    })
    assert.equal(kindOf(state), "empty")
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
    const state = resolveLineArrivalsEmptyKind({
      lineIds: ["district"],
      rowCount: SUCCESS_EMPTY_ARRIVALS.length,
      nowMs: SAT_0125,
      lineStatus: [goodService("district")],
    })
    assert.equal(kindOf(state), "ended")
    assert.equal(arrivalsLineEmptyCopy(state), ARRIVALS_EMPTY_COPY.ended)
  })

  it("keeps overnight Service Closed as ended, with a chip, never the reason", () => {
    const lineStatus = [serviceClosed("district")]
    const state = resolveLineArrivalsEmptyKind({
      lineIds: ["district"],
      rowCount: 0,
      nowMs: SAT_0125,
      lineStatus,
    })
    const copy = arrivalsLineEmptyCopy(state)
    const chip = resolveArrivalsStatusChip({
      lineIds: ["district"],
      hasTrains: false,
      emptyKind: state?.kind,
      lineStatus,
      nowMs: SAT_0125,
    })
    assert.equal(kindOf(state), "ended")
    assert.equal(copy, ARRIVALS_EMPTY_COPY.ended)
    assert.equal(chip, "Service Closed")
    assert.equal(copy.includes("resume"), false)
    assert.equal(copy.includes("Service Closed"), false)
    assert.equal(copy.includes("engineering"), false)
    assert.equal(JSON.stringify(lineStatus).includes("resume at 06:00"), true)
  })

  it("notes current suspended as disrupted without status copy", () => {
    const state = resolveLineArrivalsEmptyKind({
      lineIds: ["district"],
      rowCount: 0,
      nowMs: SAT_0125,
      lineStatus: [suspended("district")],
    })
    assert.equal(kindOf(state), "disrupted")
    assert.equal(arrivalsLineEmptyCopy(state).includes("signal failure"), false)
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
      kindOf(
        resolveLineArrivalsEmptyKind({
          lineIds: ["district"],
          rowCount: 0,
          nowMs: SAT_0125,
          lineStatus: [goodService("circle"), serviceClosed("district")],
        })
      ),
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

describe("current disruption windows", () => {
  it("uses Saturday 08:36 + this window as disrupted until 10:30, never the reason", () => {
    const lineStatus = [circlePlannedClosure(), districtPartClosure()]
    const state = resolveLineArrivalsEmptyKind({
      lineIds: ["circle", "district"],
      rowCount: 0,
      nowMs: SAT_0836,
      lineStatus,
    })
    const copy = arrivalsLineEmptyCopy(state)
    const chip = resolveArrivalsStatusChip({
      lineIds: ["circle", "district"],
      hasTrains: false,
      emptyKind: state?.kind,
      lineStatus,
      nowMs: SAT_0836,
    })
    assert.equal(kindOf(state), "disrupted")
    assert.equal(state?.resumeMs, Date.parse("2026-08-22T09:30:00Z"))
    assert.equal(formatLondonClockTime(state?.resumeMs ?? 0), "10:30")
    assert.equal(copy, "No service until 10:30.")
    assert.equal(chip, "Planned Closure")
    assert.equal(copy.includes("Planned Closure"), false)
    assert.equal(copy.includes("Part Closure"), false)
    assert.equal(copy.includes("1030"), false)
    assert.equal(copy.includes("replacement"), false)
    assert.equal(copy.includes("No arrivals right now."), false)
    assert.equal(
      isCurrentArrivalsDisruption(
        circlePlannedClosure().lineStatuses?.[0],
        SAT_0836
      ),
      true
    )
  })

  it("keeps Saturday 01:25 + window not yet started as ended, not disrupted", () => {
    const state = resolveLineArrivalsEmptyKind({
      lineIds: ["district"],
      rowCount: 0,
      nowMs: SAT_0125,
      lineStatus: [districtPartClosure()],
    })
    assert.equal(kindOf(state), "ended")
    assert.equal(arrivalsLineEmptyCopy(state), ARRIVALS_EMPTY_COPY.ended)
    assert.equal(
      isCurrentArrivalsDisruption(
        districtPartClosure().lineStatuses?.[0],
        SAT_0125
      ),
      false
    )
  })

  it("notes disruption only when the overlapping period has no toDate", () => {
    const lineStatus: ArrivalsStatusSignal[] = [
      {
        id: "district",
        lineStatuses: [
          {
            statusSeverity: 5,
            statusSeverityDescription: "Part Closure",
            reason: DISTRICT_PART_REASON,
            disruption: {
              category: "PlannedWork",
              closureText: "partClosure",
            },
            validityPeriods: [
              {
                fromDate: "2026-08-22T03:30:00Z",
                isNow: false,
              },
            ],
          },
        ],
      },
    ]
    const state = resolveLineArrivalsEmptyKind({
      lineIds: ["district"],
      rowCount: 0,
      nowMs: SAT_0836,
      lineStatus,
    })
    assert.equal(kindOf(state), "disrupted")
    assert.equal(state?.resumeMs, undefined)
    assert.equal(arrivalsLineEmptyCopy(state), ARRIVALS_EMPTY_COPY.disrupted)
    assert.equal(
      resolveArrivalsStatusChip({
        lineIds: ["district"],
        hasTrains: false,
        emptyKind: state?.kind,
        lineStatus,
        nowMs: SAT_0836,
      }),
      "Part Closure"
    )
  })

  it("returns null on fetch error even with the Saturday closure window", () => {
    assert.equal(
      resolveArrivalsEmptyKind({
        rowCount: 0,
        hasError: true,
        nowMs: SAT_0836,
        lineIds: ["circle", "district"],
        lineStatus: [circlePlannedClosure(), districtPartClosure()],
      }),
      null
    )
  })

  it("does not parse a lying reason when toDate is 09:30Z", () => {
    const state = resolveLineArrivalsEmptyKind({
      lineIds: ["circle"],
      rowCount: 0,
      nowMs: SAT_0836,
      lineStatus: [circlePlannedClosure(LYING_REASON)],
    })
    const copy = arrivalsLineEmptyCopy(state)
    assert.equal(kindOf(state), "disrupted")
    assert.equal(copy, "No service until 10:30.")
    assert.equal(copy.includes("1500"), false)
    assert.equal(copy.includes("15:00"), false)
    assert.equal(
      overlappingValidityToDateMs(
        circlePlannedClosure().lineStatuses?.[0],
        SAT_0836
      ),
      Date.parse("2026-08-22T09:30:00Z")
    )
  })

  it("accumulates overnight-split slices instead of resuming at Sunday 01:29", () => {
    const status = districtWeekendWimbledonSplit().lineStatuses?.[0]
    assert.equal(
      overlappingValidityToDateMs(status, SAT_2200),
      Date.parse("2026-08-24T00:29:00Z")
    )
    assert.equal(
      overlappingValidityToDateMs(status, SAT_2200) ===
        Date.parse("2026-08-23T00:29:00Z"),
      false
    )
  })

  it("notes No service, not until 01:29, for a Sat–Sun possession on Saturday night", () => {
    const lineStatus = [districtWeekendWimbledonSplit()]
    const state = resolveLineArrivalsEmptyKind({
      lineIds: ["district"],
      rowCount: 0,
      nowMs: SAT_2200,
      lineStatus,
      stopPointId: PARSONS_GREEN,
    })
    const copy = arrivalsLineEmptyCopy(state)
    assert.equal(kindOf(state), "disrupted")
    assert.equal(state?.resumeMs, undefined)
    assert.equal(copy, ARRIVALS_EMPTY_COPY.disrupted)
    assert.equal(copy.includes("01:29"), false)
    assert.equal(
      resolveArrivalsStatusChip({
        lineIds: ["district"],
        hasTrains: false,
        emptyKind: state?.kind,
        lineStatus,
        nowMs: SAT_2200,
        stopPointId: PARSONS_GREEN,
      }),
      "Part Closure"
    )
  })

  it("notes No service, not until 01:29, for the live union window on Sunday night", () => {
    const lineStatus = [districtWeekendWimbledonUnion()]
    const state = resolveLineArrivalsEmptyKind({
      lineIds: ["district"],
      rowCount: 0,
      nowMs: SUN_2222,
      lineStatus,
      stopPointId: PARSONS_GREEN,
    })
    const copy = arrivalsLineEmptyCopy(state)
    assert.equal(kindOf(state), "disrupted")
    assert.equal(state?.resumeMs, undefined)
    assert.equal(copy, ARRIVALS_EMPTY_COPY.disrupted)
    assert.equal(copy.includes("01:29"), false)
    assert.equal(
      formatLondonClockTime(Date.parse("2026-08-24T00:29:00Z")),
      "01:29"
    )
    assert.equal(
      overlappingValidityToDateMs(
        districtWeekendWimbledonUnion().lineStatuses?.[0],
        SUN_2222
      ),
      Date.parse("2026-08-24T00:29:00Z")
    )
  })

  it("keeps today's 10:30 resume when a later weekend sits on the same row", () => {
    const lineStatus: ArrivalsStatusSignal[] = [
      {
        id: "circle",
        lineStatuses: [
          {
            ...circlePlannedClosure().lineStatuses![0]!,
            validityPeriods: [
              saturdayEngineeringWindow,
              {
                fromDate: "2026-08-29T03:30:00Z",
                toDate: "2026-08-29T09:30:00Z",
                isNow: false,
              },
            ],
          },
        ],
      },
    ]
    const state = resolveLineArrivalsEmptyKind({
      lineIds: ["circle"],
      rowCount: 0,
      nowMs: SAT_0836,
      lineStatus,
    })
    assert.equal(kindOf(state), "disrupted")
    assert.equal(state?.resumeMs, Date.parse("2026-08-22T09:30:00Z"))
    assert.equal(arrivalsLineEmptyCopy(state), "No service until 10:30.")
  })

  it("omits the clock when merge PlannedWork resume times differ", () => {
    const state = resolveLineArrivalsEmptyKind({
      lineIds: ["circle", "district"],
      rowCount: 0,
      nowMs: SAT_0836,
      lineStatus: [
        circlePlannedClosure(),
        districtPartClosure(DISTRICT_PART_REASON, "2026-08-22T10:00:00Z"),
      ],
    })
    assert.equal(kindOf(state), "disrupted")
    assert.equal(state?.resumeMs, undefined)
    assert.equal(arrivalsLineEmptyCopy(state), ARRIVALS_EMPTY_COPY.disrupted)
  })

  it("notes W&C Information Planned Closure as No service, never 22:59", () => {
    const lineStatus = [waterlooCitySaturdayTimetable()]
    const state = resolveLineArrivalsEmptyKind({
      lineIds: ["waterloo-city"],
      rowCount: 0,
      nowMs: SAT_0836,
      lineStatus,
    })
    const copy = arrivalsLineEmptyCopy(state)
    assert.equal(kindOf(state), "disrupted")
    assert.equal(state?.resumeMs, undefined)
    assert.equal(copy, ARRIVALS_EMPTY_COPY.disrupted)
    assert.equal(copy.includes("22:59"), false)
    assert.equal(copy.includes("23:59"), false)
    assert.equal(
      resolveArrivalsStatusChip({
        lineIds: ["waterloo-city"],
        hasTrains: false,
        emptyKind: state?.kind,
        lineStatus,
        nowMs: SAT_0836,
      }),
      "Planned Closure"
    )
    assert.equal(copy.includes("does not operate"), false)
  })

  it("notes Windrush Part Suspended without the RealTime expiry clock", () => {
    const lineStatus = [windrushPartSuspended()]
    const state = resolveLineArrivalsEmptyKind({
      lineIds: ["windrush"],
      rowCount: 0,
      nowMs: SAT_0836,
      lineStatus,
    })
    const copy = arrivalsLineEmptyCopy(state)
    assert.equal(kindOf(state), "disrupted")
    assert.equal(state?.resumeMs, undefined)
    assert.equal(copy, ARRIVALS_EMPTY_COPY.disrupted)
    assert.equal(copy.includes("12:40"), false)
    assert.equal(copy.includes("11:40"), false)
    assert.equal(
      resolveArrivalsStatusChip({
        lineIds: ["windrush"],
        hasTrains: false,
        emptyKind: state?.kind,
        lineStatus,
        nowMs: SAT_0836,
      }),
      "Part Suspended"
    )
    assert.equal(copy.includes("Crystal Palace"), false)
  })

  it("keeps minor delays + empty as none, not disrupted", () => {
    const state = resolveLineArrivalsEmptyKind({
      lineIds: ["district"],
      rowCount: 0,
      nowMs: SAT_0836,
      lineStatus: [minorDelays("district")],
    })
    assert.equal(kindOf(state), "empty")
    assert.equal(arrivalsLineEmptyCopy(state), ARRIVALS_EMPTY_COPY.empty)
  })

  it("falls back to none after toDate when the window is no longer current", () => {
    const after = Date.parse("2026-08-22T09:31:00Z")
    const state = resolveLineArrivalsEmptyKind({
      lineIds: ["circle", "district"],
      rowCount: 0,
      nowMs: after,
      lineStatus: [circlePlannedClosure(), districtPartClosure()],
    })
    assert.equal(kindOf(state), "empty")
    assert.equal(arrivalsLineEmptyCopy(state), ARRIVALS_EMPTY_COPY.empty)
  })

  it("keeps predictions when one merge constituent still has trains", () => {
    assert.equal(
      resolveLineArrivalsEmptyKind({
        lineIds: ["circle", "district"],
        rowCount: 1,
        nowMs: SAT_0836,
        lineStatus: [circlePlannedClosure(), districtPartClosure()],
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
      kindOf(
        resolveArrivalsEmptyKind({
          rowCount: 0,
          domain: "rail",
          nowMs: SAT_0125,
        })
      ),
      "ended"
    )
  })

  it("does not station-wide-end Oxford Circus when Night Tube lines are listed", () => {
    assert.equal(
      kindOf(
        resolveArrivalsEmptyKind({
          rowCount: 0,
          domain: "rail",
          nowMs: SAT_0125,
          lineIds: ["bakerloo", "central", "victoria"],
        })
      ),
      "empty"
    )
  })

  it("ends Tower Hill when District and Circle are both finished", () => {
    assert.equal(
      kindOf(
        resolveArrivalsEmptyKind({
          rowCount: 0,
          domain: "rail",
          nowMs: SAT_0125,
          lineIds: ["district", "circle"],
        })
      ),
      "ended"
    )
  })

  it("disrupts Tower Hill when both merge lines share the Saturday window", () => {
    const state = resolveArrivalsEmptyKind({
      rowCount: 0,
      domain: "rail",
      nowMs: SAT_0836,
      lineIds: ["district", "circle"],
      lineStatus: [circlePlannedClosure(), districtPartClosure()],
    })
    assert.equal(kindOf(state), "disrupted")
    assert.equal(arrivalsLineEmptyCopy(state), "No service until 10:30.")
  })

  it("does not use ended for bus in the overnight window", () => {
    assert.equal(
      kindOf(
        resolveArrivalsEmptyKind({
          rowCount: 0,
          domain: "bus",
          nowMs: SAT_0125,
        })
      ),
      "empty"
    )
  })

  it("uses offline when the caller says the client is offline", () => {
    assert.equal(
      kindOf(
        resolveArrivalsEmptyKind({
          rowCount: 0,
          offline: true,
          nowMs: londonMs(SAT_MORNING, 12, 0),
        })
      ),
      "offline"
    )
  })
})

describe("arrivals status QuietChip", () => {
  const chipOf = (options: Parameters<typeof resolveArrivalsStatusChip>[0]) =>
    resolveArrivalsStatusChip(options)

  it("shows Planned Closure on the live Circle+District merge, not Part Closure", () => {
    const lineStatus = [circlePlannedClosure(), districtPartClosure()]
    assert.equal(
      chipOf({
        lineIds: ["circle", "district"],
        hasTrains: false,
        emptyKind: "disrupted",
        lineStatus,
        nowMs: SAT_0836,
      }),
      "Planned Closure"
    )
  })

  it("shows Part Closure when that is the only empty-board status", () => {
    assert.equal(
      chipOf({
        lineIds: ["district"],
        hasTrains: false,
        emptyKind: "disrupted",
        lineStatus: [districtPartClosure()],
        nowMs: SAT_0836,
      }),
      "Part Closure"
    )
  })

  it("hides Good Service on empty and ended", () => {
    assert.equal(
      chipOf({
        lineIds: ["district"],
        hasTrains: false,
        emptyKind: "empty",
        lineStatus: [goodService("district")],
        nowMs: SAT_0836,
      }),
      null
    )
    assert.equal(
      chipOf({
        lineIds: ["district"],
        hasTrains: false,
        emptyKind: "ended",
        lineStatus: [goodService("district")],
        nowMs: SAT_0125,
      }),
      null
    )
  })

  it("hides delay-only labels on an empty board", () => {
    assert.equal(
      chipOf({
        lineIds: ["district"],
        hasTrains: false,
        emptyKind: "empty",
        lineStatus: [minorDelays("district")],
        nowMs: SAT_0836,
      }),
      null
    )
  })

  it("shows Minor Delays next to a group that still has trains", () => {
    assert.equal(
      chipOf({
        lineIds: ["district"],
        hasTrains: true,
        lineStatus: [minorDelays("district")],
        nowMs: SAT_0836,
      }),
      "Minor Delays"
    )
  })

  it("lets leftover occupy a spare for Minor Delays but not add a page", () => {
    const leftover = resolveArrivalsLeftoverStatus({
      lineIds: ["district"],
      lineStatus: [minorDelays("district")],
      nowMs: SAT_0836,
    })
    assert.equal(leftover?.label, "Minor Delays")
    assert.equal(leftover?.sentence, ARRIVALS_LEFTOVER_SENTENCE)
    assert.equal(leftover?.canAddPage, false)
  })

  it("lets leftover add a page for Severe Delays", () => {
    const leftover = resolveArrivalsLeftoverStatus({
      lineIds: ["central"],
      lineStatus: [severeDelays("central")],
      nowMs: SAT_0836,
    })
    assert.equal(leftover?.label, "Severe Delays")
    assert.equal(leftover?.sentence, ARRIVALS_LEFTOVER_SENTENCE)
    assert.equal(leftover?.canAddPage, true)
  })

  it("hides Service Closed when trains are somehow present", () => {
    assert.equal(
      chipOf({
        lineIds: ["district"],
        hasTrains: true,
        lineStatus: [serviceClosed("district")],
        nowMs: SAT_0125,
      }),
      null
    )
  })

  it("shows Suspended on disrupted with no toDate", () => {
    assert.equal(
      chipOf({
        lineIds: ["district"],
        hasTrains: false,
        emptyKind: "disrupted",
        lineStatus: [suspended("district")],
        nowMs: SAT_0125,
      }),
      "Suspended"
    )
  })

  it("hides the chip on offline and fetch error", () => {
    assert.equal(
      chipOf({
        lineIds: ["district"],
        hasTrains: false,
        emptyKind: "offline",
        lineStatus: [circlePlannedClosure()],
        nowMs: SAT_0836,
      }),
      null
    )
    assert.equal(
      chipOf({
        lineIds: ["district"],
        hasTrains: false,
        emptyKind: "disrupted",
        hasError: true,
        lineStatus: [circlePlannedClosure()],
        nowMs: SAT_0836,
      }),
      null
    )
  })

  it("notes daytime Service Closed as disrupted with a chip, not the reason", () => {
    const lineStatus = [serviceClosed("district")]
    const state = resolveLineArrivalsEmptyKind({
      lineIds: ["district"],
      rowCount: 0,
      nowMs: SAT_0836,
      lineStatus,
    })
    assert.equal(kindOf(state), "disrupted")
    assert.equal(arrivalsLineEmptyCopy(state), ARRIVALS_EMPTY_COPY.disrupted)
    assert.equal(
      chipOf({
        lineIds: ["district"],
        hasTrains: false,
        emptyKind: state?.kind,
        lineStatus,
        nowMs: SAT_0836,
      }),
      "Service Closed"
    )
  })
})

describe("station-relevant arrivals status", () => {
  it("does not leftover a part closure that does not include this station", () => {
    const leftover = resolveArrivalsLeftoverStatus({
      lineIds: ["piccadilly"],
      lineStatus: [piccadillyPartClosure()],
      nowMs: SAT_0836,
      stopPointId: KINGS_CROSS,
    })
    assert.equal(leftover, null)
  })

  it("leftovers a part closure that includes this station", () => {
    const leftover = resolveArrivalsLeftoverStatus({
      lineIds: ["piccadilly"],
      lineStatus: [piccadillyPartClosure()],
      nowMs: SAT_0836,
      stopPointId: HYDE_PARK_CORNER,
    })
    assert.equal(leftover?.label, "Part Closure")
    assert.equal(leftover?.sentence, ARRIVALS_LEFTOVER_SENTENCE)
  })

  it("keeps leftover when the board has no stop id", () => {
    const leftover = resolveArrivalsLeftoverStatus({
      lineIds: ["piccadilly"],
      lineStatus: [piccadillyPartClosure()],
      nowMs: SAT_0836,
    })
    assert.equal(leftover?.label, "Part Closure")
  })

  it("keeps leftover for line-wide delays marked entire-route", () => {
    const leftover = resolveArrivalsLeftoverStatus({
      lineIds: ["victoria"],
      lineStatus: [victoriaLineWideDelays()],
      nowMs: SAT_0836,
      stopPointId: KINGS_CROSS,
    })
    assert.equal(leftover?.label, "Minor Delays")
  })

  it("does not call an unaffected station disrupted while trains are absent", () => {
    const state = resolveLineArrivalsEmptyKind({
      lineIds: ["piccadilly"],
      rowCount: 0,
      nowMs: SAT_0836,
      lineStatus: [piccadillyPartClosure()],
      stopPointId: KINGS_CROSS,
    })
    assert.equal(kindOf(state), "empty")
    assert.equal(arrivalsLineEmptyCopy(state), ARRIVALS_EMPTY_COPY.empty)
  })

  it("notes No service until the clock at a station inside the part closure", () => {
    const state = resolveLineArrivalsEmptyKind({
      lineIds: ["piccadilly"],
      rowCount: 0,
      nowMs: SAT_0836,
      lineStatus: [piccadillyPartClosure()],
      stopPointId: HYDE_PARK_CORNER,
    })
    assert.equal(kindOf(state), "disrupted")
    assert.equal(arrivalsLineEmptyCopy(state), "No service until 14:00.")
    assert.equal(
      resolveArrivalsStatusChip({
        lineIds: ["piccadilly"],
        hasTrains: false,
        emptyKind: state?.kind,
        lineStatus: [piccadillyPartClosure()],
        nowMs: SAT_0836,
        stopPointId: HYDE_PARK_CORNER,
      }),
      "Part Closure"
    )
  })

  it("keeps a geography-less closure relevant when a stop id is present", () => {
    const state = resolveLineArrivalsEmptyKind({
      lineIds: ["circle"],
      rowCount: 0,
      nowMs: SAT_0836,
      lineStatus: [circlePlannedClosure()],
      stopPointId: KINGS_CROSS,
    })
    assert.equal(kindOf(state), "disrupted")
    assert.equal(arrivalsLineEmptyCopy(state), "No service until 10:30.")
  })

  it("treats isEntireRouteSection as affecting every station on the line", () => {
    const status = circlePlannedClosure().lineStatuses![0]!
    const withEntire = {
      ...status,
      disruption: {
        ...status.disruption,
        affectedRoutes: [{ isEntireRouteSection: true }],
      },
    }
    assert.equal(statusAffectsStation(withEntire, [KINGS_CROSS]), true)
    assert.equal(
      statusAffectsStation(piccadillyPartClosure().lineStatuses![0]!, [
        KINGS_CROSS,
      ]),
      false
    )
    assert.equal(
      statusAffectsStation(piccadillyPartClosure().lineStatuses![0]!, [
        HYDE_PARK_CORNER,
      ]),
      true
    )
  })

  it("expands King's Cross hub members from the tube naptan", () => {
    const ids = stationIdentityIdsForStop(KINGS_CROSS)
    assert.ok(ids.includes(KINGS_CROSS))
    assert.ok(ids.length >= 1)
  })
})
