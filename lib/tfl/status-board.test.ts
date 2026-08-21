import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  partitionStatusBoardLines,
  splitByPriority,
} from "@/lib/tfl/status-board"
import type { StatusLine } from "@/lib/tfl/status-types"

const SATURDAY = Date.parse("2026-08-15T16:30:00Z")
const NIGHT = Date.parse("2026-08-16T00:45:00Z")

const waterlooCity: StatusLine = {
  id: "waterloo-city",
  name: "Waterloo & City",
  modeName: "tube",
  lineStatuses: [
    {
      statusSeverity: 4,
      statusSeverityDescription: "Planned Closure",
      reason:
        "Waterloo & City line: service operates 06:00 until 00:30, Monday to Friday only.",
      validityPeriods: [
        {
          isNow: false,
          fromDate: "2026-08-15T03:15:00Z",
          toDate: "2026-08-15T22:59:00Z",
        },
      ],
      disruption: { category: "Information" },
    },
    {
      statusSeverity: 20,
      statusSeverityDescription: "Service Closed",
      reason:
        "Waterloo and City Line: Service will resume at 06:00 on Monday. ",
      validityPeriods: [
        {
          isNow: true,
          fromDate: "2026-08-14T23:30:27Z",
          toDate: "2026-08-15T18:58:13Z",
        },
      ],
      disruption: { category: "RealTime" },
    },
  ],
}

const jubilee: StatusLine = {
  id: "jubilee",
  name: "Jubilee",
  modeName: "tube",
  lineStatuses: [
    {
      statusSeverity: 6,
      statusSeverityDescription: "Severe Delays",
      reason: "Jubilee Line: Severe delays due to an earlier signal failure.",
      disruption: { category: "RealTime" },
      validityPeriods: [
        {
          isNow: true,
          fromDate: "2026-08-15T15:29:09Z",
          toDate: "2026-08-16T00:29:00Z",
        },
      ],
    },
  ],
}

const tram: StatusLine = {
  id: "tram",
  name: "Tram",
  modeName: "tram",
  lineStatuses: [
    {
      statusSeverity: 5,
      statusSeverityDescription: "Part Closure",
      reason:
        "LONDON TRAMS: From Thursday 6 until Sunday 23 August, no service between Reeves Corner and East Croydon.",
      disruption: { category: "PlannedWork" },
      validityPeriods: [
        {
          isNow: false,
          fromDate: "2026-08-15T03:15:00Z",
          toDate: "2026-08-15T22:59:00Z",
        },
      ],
    },
  ],
}

const mildmay: StatusLine = {
  id: "mildmay",
  name: "Mildmay",
  modeName: "overground",
  lineStatuses: [
    {
      statusSeverity: 6,
      statusSeverityDescription: "Severe Delays",
      reason: "Mildmay Line: Severe delays and part suspended.",
      disruption: { category: "RealTime" },
    },
    {
      statusSeverity: 3,
      statusSeverityDescription: "Part Suspended",
      reason: "Mildmay Line: Severe delays and part suspended.",
      disruption: { category: "RealTime" },
    },
  ],
}

const metropolitan: StatusLine = {
  id: "metropolitan",
  name: "Metropolitan",
  modeName: "tube",
  lineStatuses: [
    {
      statusSeverity: 9,
      statusSeverityDescription: "Minor Delays",
      reason:
        "Metropolitan Line: Minor delays between Harrow-on-the-Hill and Uxbridge due to train cancellations. GOOD SERVICE on the rest of the line.",
      disruption: { category: "RealTime" },
    },
  ],
}

const victoria: StatusLine = {
  id: "victoria",
  name: "Victoria",
  modeName: "tube",
  lineStatuses: [
    {
      statusSeverity: 10,
      statusSeverityDescription: "Good Service",
    },
  ],
}

const bakerlooClosed: StatusLine = {
  id: "bakerloo",
  name: "Bakerloo",
  modeName: "tube",
  lineStatuses: [
    {
      statusSeverity: 20,
      statusSeverityDescription: "Service Closed",
      reason: "Bakerloo Line: Service will resume at 06:00.",
      disruption: { category: "RealTime" },
    },
  ],
}

const cableCarWind: StatusLine = {
  id: "emirates-air-line",
  name: "London Cable Car",
  modeName: "cable-car",
  lineStatuses: [
    {
      statusSeverity: 1,
      statusSeverityDescription: "Closed",
      reason: "Closed due to high winds.",
      disruption: { category: "RealTime" },
    },
  ],
}

const cableCarHours: StatusLine = {
  id: "emirates-air-line",
  name: "London Cable Car",
  modeName: "cable-car",
  lineStatuses: [
    {
      statusSeverity: 20,
      statusSeverityDescription: "Service Closed",
      reason: "Service will resume at 08:00.",
      disruption: { category: "RealTime" },
    },
  ],
}

const ids = (rows: { line: StatusLine }[]) => rows.map((row) => row.line.id)

describe("partitionStatusBoardLines", () => {
  it("puts Saturday W&C last in Disruptions, not in Good Service", () => {
    const sections = partitionStatusBoardLines(
      [waterlooCity, jubilee, victoria],
      { now: SATURDAY }
    )

    assert.deepEqual(ids(sections.disruptions), ["jubilee", "waterloo-city"])
    assert.equal(sections.disruptions[1]?.kind, "closed")
    assert.deepEqual(ids(sections.goodService), ["victoria"])
    assert.match(
      sections.disruptions[1]?.announcements[0]?.text ?? "",
      /resume at 06:00 on Monday/
    )
    assert.equal(sections.disruptions[1]?.announcements.length, 1)
  })

  it("keeps tram Part Closure with isNow false in Disruptions as planned work", () => {
    const sections = partitionStatusBoardLines([tram, victoria], {
      now: SATURDAY,
    })

    assert.deepEqual(ids(sections.disruptions), ["tram"])
    assert.equal(sections.disruptions[0]?.kind, "plannedWork")
    assert.deepEqual(ids(sections.goodService), ["victoria"])
  })

  it("ranks Mildmay on the worse RealTime row and keeps one paragraph", () => {
    const sections = partitionStatusBoardLines([mildmay, jubilee], {
      now: SATURDAY,
    })

    assert.deepEqual(ids(sections.disruptions), ["mildmay", "jubilee"])
    assert.equal(sections.disruptions[0]?.kind, "incident")
    assert.equal(sections.disruptions[0]?.announcements.length, 1)
    assert.equal(sections.disruptions[0]?.announcements[0]?.statusSeverity, 3)
  })

  it("keeps Metropolitan branch delays as a whole-line incident", () => {
    const sections = partitionStatusBoardLines([metropolitan], {
      now: SATURDAY,
    })

    assert.deepEqual(ids(sections.disruptions), ["metropolitan"])
    assert.match(
      sections.disruptions[0]?.announcements[0]?.text ?? "",
      /GOOD SERVICE on the rest/
    )
  })

  it("puts overnight Bakerloo last in Disruptions and Victoria in Good service", () => {
    const sections = partitionStatusBoardLines([bakerlooClosed, victoria], {
      now: NIGHT,
    })

    assert.deepEqual(ids(sections.disruptions), ["bakerloo"])
    assert.equal(sections.disruptions[0]?.kind, "closed")
    assert.deepEqual(ids(sections.goodService), ["victoria"])
  })

  it("treats cable-car Closed (1) as an incident, Service Closed (20) as closed-last", () => {
    const wind = partitionStatusBoardLines([cableCarWind], { now: SATURDAY })
    const hours = partitionStatusBoardLines([cableCarHours], { now: SATURDAY })

    assert.deepEqual(ids(wind.disruptions), ["emirates-air-line"])
    assert.equal(wind.disruptions[0]?.kind, "incident")
    assert.deepEqual(ids(hours.disruptions), ["emirates-air-line"])
    assert.equal(hours.disruptions[0]?.kind, "closed")
  })
})

describe("splitByPriority", () => {
  it("treats every row as priority when the list is empty", () => {
    const sections = partitionStatusBoardLines(
      [jubilee, victoria, metropolitan],
      { now: SATURDAY }
    )
    const split = splitByPriority(sections.disruptions, [])
    assert.deepEqual(ids(split.priority), ids(sections.disruptions))
    assert.deepEqual(ids(split.other), [])
  })

  it("keeps severity order inside each bucket", () => {
    const sections = partitionStatusBoardLines(
      [jubilee, metropolitan, victoria, waterlooCity],
      { now: SATURDAY }
    )
    const split = splitByPriority(sections.disruptions, ["metropolitan"])
    assert.deepEqual(ids(split.priority), ["metropolitan"])
    assert.deepEqual(ids(split.other), ["jubilee", "waterloo-city"])
  })
})
