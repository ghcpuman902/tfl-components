import assert from "node:assert/strict"
import { describe, it } from "node:test"
import type { RealtimePrediction } from "tfl-ts"
import { ARRIVALS_PLATFORM_UNKNOWN_HEADING } from "@/lib/tfl/arrivals-empty"
import {
  applyRailLeftoverStatus,
  arrivalIdentityKey,
  chunkBoundPages,
  isExpiredArrivalPrediction,
  prepareBusArrivals,
  prepareRailArrivals,
  sliceBoundPage,
} from "@/lib/tfl/arrivals-prepare"

const prediction = (fields: {
  id: string
  lineId: string
  lineName?: string
  modeName?: string
  platformName?: string
  towards?: string
  timeToStation: number
  vehicleId?: string
}): RealtimePrediction =>
  ({
    lineName: fields.lineName ?? fields.lineId,
    towards: fields.towards ?? "Somewhere",
    ...fields,
  }) as RealtimePrediction

const idsOf = (rows: { arrival: RealtimePrediction }[]) =>
  rows.map((row) => row.arrival.id)

const groupNames = (groups: { lineName: string }[]) =>
  groups.map((group) => group.lineName)

const boundLabels = (groups: { bounds: { label: string | null }[] }[]) =>
  groups.flatMap((group) =>
    group.bounds.map((bound) => `${group.lineName}:${bound.label ?? "none"}`)
  )

describe("prepareRailArrivals", () => {
  const bakerlooNorth = prediction({
    id: "b-n",
    lineId: "bakerloo",
    lineName: "Bakerloo",
    modeName: "tube",
    platformName: "Northbound - Platform 3",
    timeToStation: 180,
  })
  const bakerlooSouth = prediction({
    id: "b-s",
    lineId: "bakerloo",
    lineName: "Bakerloo",
    modeName: "tube",
    platformName: "Southbound - Platform 4",
    timeToStation: 40,
  })
  const centralWest = prediction({
    id: "c-w",
    lineId: "central",
    lineName: "Central",
    modeName: "tube",
    platformName: "Westbound - Platform 1",
    timeToStation: 20,
  })
  const victoriaSouth = prediction({
    id: "v-s",
    lineId: "victoria",
    lineName: "Victoria",
    modeName: "tube",
    platformName: "Southbound - Platform 5",
    timeToStation: 10,
  })

  const oxfordLines = [
    {
      lineId: "bakerloo",
      lineName: "Bakerloo",
      modeName: "tube",
      bounds: ["northbound", "southbound"] as const,
    },
    {
      lineId: "central",
      lineName: "Central",
      modeName: "tube",
      bounds: ["westbound", "eastbound"] as const,
    },
    {
      lineId: "victoria",
      lineName: "Victoria",
      modeName: "tube",
      bounds: ["northbound", "southbound"] as const,
    },
  ]

  it("keeps line order canonical when a line is empty or live", () => {
    const liveOnly = prepareRailArrivals({
      data: [victoriaSouth, bakerlooNorth],
      lines: oxfordLines,
    })
    assert.deepEqual(groupNames(liveOnly.groups), [
      "Central",
      "Victoria",
      "Bakerloo",
    ])
    assert.equal(liveOnly.groups[0]?.hasInformation, false)
    assert.equal(liveOnly.groups[1]?.hasInformation, true)
    assert.equal(liveOnly.groups[2]?.hasInformation, true)

    const allLive = prepareRailArrivals({
      data: [victoriaSouth, bakerlooNorth, centralWest],
      lines: oxfordLines,
    })
    assert.deepEqual(groupNames(allLive.groups), [
      "Central",
      "Victoria",
      "Bakerloo",
    ])
  })

  it("keeps compass bound order stable", () => {
    const board = prepareRailArrivals({
      data: [bakerlooNorth, bakerlooSouth, centralWest],
      lines: oxfordLines,
    })
    assert.deepEqual(boundLabels(board.groups), [
      "Central:Westbound · Platform 1",
      "Central:Eastbound",
      "Victoria:Northbound",
      "Victoria:Southbound",
      "Bakerloo:Northbound · Platform 3",
      "Bakerloo:Southbound · Platform 4",
    ])
  })

  it("keeps row keys unique when TfL repeats a prediction id", () => {
    const first = {
      ...prediction({
        id: "322784161",
        lineId: "dlr",
        lineName: "DLR",
        platformName: "Eastbound - Platform 1",
        timeToStation: 120,
      }),
      expectedArrival: "2026-08-17T19:02:00Z",
    }
    const second = {
      ...prediction({
        id: "322784161",
        lineId: "dlr",
        lineName: "DLR",
        platformName: "Eastbound - Platform 1",
        timeToStation: 240,
      }),
      expectedArrival: "2026-08-17T19:04:00Z",
    }
    const board = prepareRailArrivals({ data: [first, second] })
    const keys = board.groups.flatMap((group) =>
      group.bounds.flatMap((bound) => bound.rows.map((row) => row.key))
    )
    assert.equal(keys.length, 2)
    assert.equal(new Set(keys).size, keys.length)
  })

  it("sorts arrivals by time within each bound", () => {
    const laterNorth = prediction({
      id: "b-n-late",
      lineId: "bakerloo",
      lineName: "Bakerloo",
      platformName: "Northbound - Platform 3",
      timeToStation: 400,
    })
    const board = prepareRailArrivals({
      data: [laterNorth, bakerlooNorth],
    })
    const north = board.groups[0]?.bounds.find(
      (bound) => bound.boundId === "northbound"
    )
    assert.deepEqual(idsOf(north?.rows ?? []), ["b-n", "b-n-late"])
  })

  it("preserves source line, bound, and row order when asked", () => {
    const board = prepareRailArrivals({
      data: [victoriaSouth, bakerlooNorth, bakerlooSouth, centralWest],
      lines: oxfordLines,
      sortBy: "source",
      lineSortBy: "source",
      boundSortBy: "source",
    })
    assert.deepEqual(groupNames(board.groups), [
      "Victoria",
      "Bakerloo",
      "Central",
    ])
    const bakerloo = board.groups.find((group) => group.lineId === "bakerloo")
    assert.deepEqual(
      bakerloo?.bounds.map((bound) => bound.boundId),
      ["northbound", "southbound"]
    )
    assert.deepEqual(idsOf(bakerloo?.bounds[0]?.rows ?? []), ["b-n"])
    assert.deepEqual(idsOf(bakerloo?.bounds[1]?.rows ?? []), ["b-s"])
  })

  it("keeps equal timeToStation in input order", () => {
    const first = prediction({
      id: "first",
      lineId: "central",
      lineName: "Central",
      platformName: "Westbound - Platform 1",
      timeToStation: 60,
    })
    const second = prediction({
      id: "second",
      lineId: "central",
      lineName: "Central",
      platformName: "Westbound - Platform 1",
      timeToStation: 60,
    })
    const board = prepareRailArrivals({ data: [first, second] })
    assert.deepEqual(idsOf(board.rows), ["first", "second"])
  })

  it("applies ordering before maxRows on unsorted input", () => {
    const board = prepareRailArrivals({
      data: [bakerlooNorth, victoriaSouth, centralWest],
      maxRows: 2,
    })
    assert.deepEqual(idsOf(board.rows), ["c-w", "v-s", "b-n"])
    assert.deepEqual(groupNames(board.groups), [
      "Central",
      "Victoria",
      "Bakerloo",
    ])
  })

  it("does not drop later canonical lines when an earlier bound is busy", () => {
    const centralCrowd = Array.from({ length: 12 }, (_, index) =>
      prediction({
        id: `c-w-${index}`,
        lineId: "central",
        lineName: "Central",
        modeName: "tube",
        platformName: "Westbound - Platform 1",
        timeToStation: 30 + index,
      })
    )
    const board = prepareRailArrivals({
      data: [...centralCrowd, bakerlooNorth],
      lines: oxfordLines,
      maxRows: 3,
    })
    assert.deepEqual(groupNames(board.groups), [
      "Central",
      "Victoria",
      "Bakerloo",
    ])
    const centralWestBound = board.groups[0]?.bounds.find(
      (bound) => bound.boundId === "westbound"
    )
    assert.equal(centralWestBound?.rows.length, 3)
    const bakerloo = board.groups.find((group) => group.lineId === "bakerloo")
    assert.equal(bakerloo?.hasInformation, true)
    assert.deepEqual(
      idsOf(
        bakerloo?.bounds.find((bound) => bound.boundId === "northbound")
          ?.rows ?? []
      ),
      ["b-n"]
    )
  })

  it("does not mutate the caller's data", () => {
    const data = [victoriaSouth, bakerlooNorth]
    const snapshot = data.map((row) => row.id)
    prepareRailArrivals({ data, maxRows: 1 })
    assert.equal(data[0], victoriaSouth)
    assert.equal(data[1], bakerlooNorth)
    assert.deepEqual(
      data.map((row) => row.id),
      snapshot
    )
  })

  it("ranks listed lines by lineOrder and leaves unlisted after, canonical", () => {
    const board = prepareRailArrivals({
      data: [victoriaSouth, bakerlooNorth, centralWest],
      lines: oxfordLines,
      lineOrder: ["victoria", "central"],
    })
    assert.deepEqual(groupNames(board.groups), [
      "Victoria",
      "Central",
      "Bakerloo",
    ])
  })

  it("groups Elizabeth line letter platforms when there is no compass prefix", () => {
    const platformA = prediction({
      id: "elz-a",
      lineId: "elizabeth",
      lineName: "Elizabeth line",
      modeName: "elizabeth-line",
      platformName: "A",
      towards: "",
      timeToStation: 90,
    })
    const platformB = prediction({
      id: "elz-b",
      lineId: "elizabeth",
      lineName: "Elizabeth line",
      modeName: "elizabeth-line",
      platformName: "B",
      towards: "",
      timeToStation: 40,
    })
    const board = prepareRailArrivals({ data: [platformA, platformB] })
    assert.deepEqual(boundLabels(board.groups), [
      "Elizabeth line:Platform A",
      "Elizabeth line:Platform B",
    ])
    assert.deepEqual(idsOf(board.groups[0]?.bounds[0]?.rows ?? []), ["elz-a"])
    assert.deepEqual(idsOf(board.groups[0]?.bounds[1]?.rows ?? []), ["elz-b"])
  })

  it("groups Overground numbered platforms when there is no compass prefix", () => {
    const platform1 = prediction({
      id: "wdr-1",
      lineId: "windrush",
      lineName: "Windrush",
      modeName: "overground",
      platformName: "1",
      towards: "",
      timeToStation: 120,
    })
    const platform2 = prediction({
      id: "wdr-2",
      lineId: "windrush",
      lineName: "Windrush",
      modeName: "overground",
      platformName: "2",
      towards: "",
      timeToStation: 30,
    })
    const board = prepareRailArrivals({ data: [platform1, platform2] })
    assert.deepEqual(boundLabels(board.groups), [
      "Windrush:Platform 1",
      "Windrush:Platform 2",
    ])
  })

  it("still prefers compass bounds over a platform number", () => {
    const board = prepareRailArrivals({
      data: [bakerlooNorth, bakerlooSouth],
    })
    assert.deepEqual(boundLabels(board.groups), [
      "Bakerloo:Northbound · Platform 3",
      "Bakerloo:Southbound · Platform 4",
    ])
  })

  it("groups literal Platform Unknown under a stable fallback heading", () => {
    const unknown = prediction({
      id: "unk",
      lineId: "central",
      lineName: "Central",
      platformName: "Platform Unknown",
      timeToStation: 20,
    })
    const board = prepareRailArrivals({ data: [unknown] })
    assert.deepEqual(boundLabels(board.groups), [
      `Central:${ARRIVALS_PLATFORM_UNKNOWN_HEADING}`,
    ])
    const bound = board.groups[0]?.bounds[0]
    assert.equal(bound?.kind, "unknown")
    assert.equal(bound?.platformUniform, false)
  })

  it("treats a missing platformName as the unknown-platform bucket", () => {
    const missing = prediction({
      id: "miss",
      lineId: "weaver",
      lineName: "Weaver",
      timeToStation: 70,
    })
    const board = prepareRailArrivals({ data: [missing] })
    assert.equal(board.groups[0]?.bounds[0]?.kind, "unknown")
    assert.equal(
      board.groups[0]?.bounds[0]?.label,
      ARRIVALS_PLATFORM_UNKNOWN_HEADING
    )
  })

  it("hoists a uniform platform into a compass heading", () => {
    const board = prepareRailArrivals({ data: [bakerlooNorth] })
    const north = board.groups[0]?.bounds[0]
    assert.equal(north?.label, "Northbound · Platform 3")
    assert.equal(north?.platformUniform, true)
    assert.equal(north?.platformLabel, "3")
    assert.equal(north?.kind, "compass")
  })

  it("hoists Inner/Outer Rail platforms with the qualifier, not a bare compass, and no double Platform", () => {
    // Paddington Circle / Bayswater / Notting Hill Gate: compass direction is
    // ambiguous on this shared Circle/H&C stretch, so TfL uses Inner/Outer
    // Rail instead of Westbound/Eastbound.
    const inner = prediction({
      id: "pac-inner",
      lineId: "hammersmith-city",
      lineName: "Hammersmith & City",
      platformName: "Inner Rail - Platform 1",
      timeToStation: 90,
    })
    const outer = prediction({
      id: "pac-outer",
      lineId: "circle",
      lineName: "Circle",
      platformName: "Outer Rail - Platform 2",
      timeToStation: 60,
    })
    const board = prepareRailArrivals({
      data: [inner, outer],
      lineGroups: [{ lines: ["circle", "hammersmith-city"] }],
    })
    const bounds = board.groups[0]?.bounds ?? []
    const innerBound = bounds.find((b) => b.railDesignation === "inner")
    const outerBound = bounds.find((b) => b.railDesignation === "outer")
    assert.equal(innerBound?.label, "Inner Rail · Platform 1")
    assert.equal(innerBound?.platformLabel, "1")
    assert.equal(innerBound?.platformUniform, true)
    assert.equal(outerBound?.label, "Outer Rail · Platform 2")
    assert.equal(outerBound?.platformLabel, "2")
  })

  it("keeps the compass heading and does not hoist when platforms vary", () => {
    const platform1 = prediction({
      id: "c-p1",
      lineId: "central",
      lineName: "Central",
      platformName: "Westbound - Platform 1",
      timeToStation: 20,
    })
    const platform2 = prediction({
      id: "c-p2",
      lineId: "central",
      lineName: "Central",
      platformName: "Westbound - Platform 2",
      timeToStation: 40,
    })
    const board = prepareRailArrivals({ data: [platform1, platform2] })
    const west = board.groups[0]?.bounds[0]
    assert.equal(west?.label, "Westbound")
    assert.equal(west?.platformUniform, false)
    assert.equal(west?.platformLabel, null)
    assert.equal(west?.rows.length, 2)
  })

  it("merges lineGroups into one section and keeps per-row line identity", () => {
    const circleEast = prediction({
      id: "cir-e",
      lineId: "circle",
      lineName: "Circle",
      modeName: "tube",
      platformName: "Eastbound - Platform 1",
      towards: "Edgware Road (Circle)",
      timeToStation: 120,
    })
    const hcWest = prediction({
      id: "hc-w",
      lineId: "hammersmith-city",
      lineName: "Hammersmith & City",
      modeName: "tube",
      platformName: "Westbound - Platform 2",
      towards: "Hammersmith",
      timeToStation: 60,
    })
    const metEast = prediction({
      id: "met-e",
      lineId: "metropolitan",
      lineName: "Metropolitan",
      modeName: "tube",
      platformName: "Eastbound - Platform 1",
      towards: "Aldgate",
      timeToStation: 90,
    })
    const centralWestOnly = prediction({
      id: "cen-w",
      lineId: "central",
      lineName: "Central",
      modeName: "tube",
      platformName: "Westbound - Platform 5",
      timeToStation: 30,
    })
    const board = prepareRailArrivals({
      data: [circleEast, hcWest, metEast, centralWestOnly],
      lineGroups: [{ lines: ["circle", "hammersmith-city", "metropolitan"] }],
    })
    assert.deepEqual(groupNames(board.groups), [
      "Central",
      "Circle, Hammersmith & City and Metropolitan",
    ])
    const merged = board.groups.find((group) => group.lineIds.length > 1)
    assert.ok(merged)
    assert.deepEqual(merged.lineIds, [
      "circle",
      "hammersmith-city",
      "metropolitan",
    ])
    assert.equal(merged.lineId, "circle")
    const west = merged.bounds.find((bound) => bound.boundId === "westbound")
    const east = merged.bounds.find((bound) => bound.boundId === "eastbound")
    assert.equal(west?.label, "Westbound · Platform 2")
    assert.equal(east?.label, "Eastbound · Platform 1")
    assert.deepEqual(idsOf(west?.rows ?? []), ["hc-w"])
    assert.deepEqual(idsOf(east?.rows ?? []), ["met-e", "cir-e"])
    assert.equal(east?.rows[0]?.arrival.lineId, "metropolitan")
    assert.equal(east?.rows[1]?.arrival.lineId, "circle")
    const central = board.groups.find((group) => group.lineId === "central")
    assert.equal(central?.lineIds.length, 1)
  })

  it("buckets a remapped shared-track arrival by canonicalLineId", () => {
    const hcPaintedAsCircle = {
      ...prediction({
        id: "hc-as-cir",
        lineId: "hammersmith-city",
        lineName: "Hammersmith & City",
        modeName: "tube",
        platformName: "Westbound - Platform 2",
        towards: "Hammersmith",
        timeToStation: 80,
      }),
      sharedTrackIdentity: {
        canonicalLineId: "circle",
        confidence: "exclusive-segment" as const,
        rawLineId: "hammersmith-city",
      },
    }
    const board = prepareRailArrivals({
      data: [hcPaintedAsCircle],
    })
    assert.deepEqual(groupNames(board.groups), ["Circle"])
    assert.equal(board.groups[0]?.lineId, "circle")
    assert.equal(
      board.groups[0]?.bounds[0]?.rows[0]?.arrival.lineId,
      "hammersmith-city"
    )
  })

  it("leaves an untagged shared-track arrival on its raw line", () => {
    const ambiguous = prediction({
      id: "hc-amb",
      lineId: "hammersmith-city",
      lineName: "Hammersmith & City",
      modeName: "tube",
      platformName: "Westbound - Platform 2",
      towards: "Check Front of Train",
      timeToStation: 80,
    })
    const board = prepareRailArrivals({ data: [ambiguous] })
    assert.deepEqual(groupNames(board.groups), ["Hammersmith & City"])
  })

  it("dedupes the same vehicle listed on two lines in a merged section", () => {
    const hc = {
      ...prediction({
        id: "hc-406",
        lineId: "hammersmith-city",
        lineName: "Hammersmith & City",
        modeName: "tube",
        platformName: "Westbound - Platform 2",
        towards: "Check Front of Train",
        timeToStation: 80,
        vehicleId: "406",
      }),
      sharedTrackIdentity: {
        confidence: "ambiguous" as const,
        rawLineId: "hammersmith-city",
        rawLineIds: ["hammersmith-city", "metropolitan"],
      },
    }
    const met = {
      ...prediction({
        id: "met-406",
        lineId: "metropolitan",
        lineName: "Metropolitan",
        modeName: "tube",
        platformName: "Westbound - Platform 2",
        towards: "Check Front of Train",
        timeToStation: 80,
        vehicleId: "406",
      }),
      sharedTrackIdentity: {
        confidence: "ambiguous" as const,
        rawLineId: "metropolitan",
        rawLineIds: ["hammersmith-city", "metropolitan"],
      },
    }
    const board = prepareRailArrivals({
      data: [hc, met],
      lineGroups: [{ lines: ["circle", "hammersmith-city", "metropolitan"] }],
    })
    const merged = board.groups.find((group) => group.lineIds.length > 1)
    assert.ok(merged)
    assert.equal(merged.bounds[0]?.rows.length, 1)
    assert.equal(merged.bounds[0]?.rows[0]?.arrival.vehicleId, "406")
  })

  it("does not collapse distinct arrivals that share placeholder vehicleId 000", () => {
    const westA = prediction({
      id: "met-wb-a",
      lineId: "metropolitan",
      lineName: "Metropolitan",
      modeName: "tube",
      platformName: "Westbound - Platform 1",
      towards: "Uxbridge",
      timeToStation: 180,
      vehicleId: "000",
    })
    const westB = prediction({
      id: "met-wb-b",
      lineId: "metropolitan",
      lineName: "Metropolitan",
      modeName: "tube",
      platformName: "Westbound - Platform 1",
      towards: "Uxbridge",
      timeToStation: 360,
      vehicleId: "000",
    })
    const eastA = prediction({
      id: "met-eb-a",
      lineId: "metropolitan",
      lineName: "Metropolitan",
      modeName: "tube",
      platformName: "Eastbound - Platform 2",
      towards: "Check Front of Train",
      timeToStation: 240,
      vehicleId: "000",
    })
    const eastB = prediction({
      id: "met-eb-b",
      lineId: "metropolitan",
      lineName: "Metropolitan",
      modeName: "tube",
      platformName: "Eastbound - Platform 2",
      towards: "Check Front of Train",
      timeToStation: 420,
      vehicleId: "0",
    })
    const known = prediction({
      id: "met-wb-known",
      lineId: "metropolitan",
      lineName: "Metropolitan",
      modeName: "tube",
      platformName: "Westbound - Platform 1",
      towards: "Uxbridge",
      timeToStation: 900,
      vehicleId: "436",
    })
    const board = prepareRailArrivals({
      data: [westA, westB, eastA, eastB, known],
    })
    const metropolitan = board.groups.find(
      (group) => group.lineId === "metropolitan"
    )
    assert.ok(metropolitan)
    const west = metropolitan.bounds.find((bound) =>
      bound.label?.startsWith("Westbound")
    )
    const east = metropolitan.bounds.find((bound) =>
      bound.label?.startsWith("Eastbound")
    )
    assert.deepEqual(idsOf(west?.rows ?? []), [
      "met-wb-a",
      "met-wb-b",
      "met-wb-known",
    ])
    assert.deepEqual(idsOf(east?.rows ?? []), ["met-eb-a", "met-eb-b"])
  })

  it("buckets an ambiguous tagged arrival by raw lineId", () => {
    const ambiguous = {
      ...prediction({
        id: "hc-amb-tag",
        lineId: "hammersmith-city",
        lineName: "Hammersmith & City",
        modeName: "tube",
        platformName: "Westbound - Platform 2",
        towards: "Check Front of Train",
        timeToStation: 80,
      }),
      sharedTrackIdentity: {
        confidence: "ambiguous" as const,
        rawLineId: "hammersmith-city",
        rawLineIds: ["hammersmith-city", "metropolitan"],
      },
    }
    const board = prepareRailArrivals({ data: [ambiguous] })
    assert.deepEqual(groupNames(board.groups), ["Hammersmith & City"])
    assert.equal(
      board.groups[0]?.bounds[0]?.rows[0]?.arrival.lineId,
      "hammersmith-city"
    )
  })

  it("does not seed a permanently-empty Circle section at Hammersmith", () => {
    // TfL tags every Circle-bound train through Hammersmith's H&C building
    // as "hammersmith-city" — a real "circle" row never arrives there. Seed
    // all four hub lines (as the Board/Explorer do) with the Circle+H&C
    // merge applied; Circle must fold into the merged section instead of
    // showing its own "No information" placeholder.
    const hc1 = prediction({
      id: "hsc-1",
      lineId: "hammersmith-city",
      lineName: "Hammersmith & City",
      modeName: "tube",
      platformName: "Eastbound - Platform 2",
      towards: "Barking",
      timeToStation: 90,
    })
    const hc2 = prediction({
      id: "hsc-2",
      lineId: "hammersmith-city",
      lineName: "Hammersmith & City",
      modeName: "tube",
      platformName: "Eastbound - Platform 2",
      towards: "Barking",
      timeToStation: 300,
    })
    const district = prediction({
      id: "hsd-district",
      lineId: "district",
      lineName: "District",
      modeName: "tube",
      platformName: "Eastbound - Platform 4",
      towards: "Upminster",
      timeToStation: 120,
    })
    const piccadilly = prediction({
      id: "hsd-picc",
      lineId: "piccadilly",
      lineName: "Piccadilly",
      modeName: "tube",
      platformName: "Eastbound - Platform 3",
      towards: "Cockfosters",
      timeToStation: 150,
    })
    const hammersmithLines = [
      { lineId: "circle", lineName: "Circle", modeName: "tube" },
      { lineId: "district", lineName: "District", modeName: "tube" },
      {
        lineId: "hammersmith-city",
        lineName: "Hammersmith & City",
        modeName: "tube",
      },
      { lineId: "piccadilly", lineName: "Piccadilly", modeName: "tube" },
    ]
    const board = prepareRailArrivals({
      data: [hc1, hc2, district, piccadilly],
      lines: hammersmithLines,
      lineGroups: [{ lines: ["circle", "hammersmith-city"] }],
    })
    assert.deepEqual(
      new Set(groupNames(board.groups)),
      new Set(["Circle and Hammersmith & City", "District", "Piccadilly"])
    )
    const merged = board.groups.find((group) => group.lineIds.length > 1)
    assert.ok(merged)
    assert.equal(merged.hasInformation, true)
    assert.deepEqual(idsOf(merged.bounds.flatMap((b) => b.rows)).sort(), [
      "hsc-1",
      "hsc-2",
    ])
  })

  it("ignores lineGroups with a single id", () => {
    const board = prepareRailArrivals({
      data: [bakerlooNorth, centralWest],
      lineGroups: [{ lines: ["bakerloo"] }],
    })
    assert.deepEqual(groupNames(board.groups), ["Central", "Bakerloo"])
  })

  it("drops predictions whose timeToLive has already expired when now is given", () => {
    // Live pattern on Weaver at Liverpool Street / Elizabeth line at
    // Paddington: a "self-destination" row (destination == this station,
    // no direction) reports timeToLive ~1 minute in the past while
    // timeToStation keeps counting up for the next scheduled slot.
    const now = Date.parse("2026-08-15T21:00:00Z")
    const selfDestination = {
      ...prediction({
        id: "weaver-self",
        lineId: "weaver",
        lineName: "Weaver",
        modeName: "overground",
        platformName: "Platform 1",
        towards: "",
        timeToStation: 600,
      }),
      destinationName: "London Liverpool Street Rail Station",
      timeToLive: "2026-08-15T20:59:10Z",
    }
    const liveDeparture = {
      ...prediction({
        id: "weaver-live",
        lineId: "weaver",
        lineName: "Weaver",
        modeName: "overground",
        platformName: "Platform 7",
        timeToStation: 90,
      }),
      timeToLive: "2026-08-15T21:03:00Z",
    }
    const noTimeToLive = prediction({
      id: "weaver-no-ttl",
      lineId: "weaver",
      lineName: "Weaver",
      platformName: "Platform Unknown",
      timeToStation: 45,
    })

    const filtered = prepareRailArrivals({
      data: [selfDestination, liveDeparture, noTimeToLive],
      now,
    })
    assert.deepEqual(
      idsOf(filtered.rows).sort(),
      ["weaver-live", "weaver-no-ttl"].sort()
    )

    const unfiltered = prepareRailArrivals({
      data: [selfDestination, liveDeparture, noTimeToLive],
    })
    assert.deepEqual(
      idsOf(unfiltered.rows).sort(),
      ["weaver-no-ttl", "weaver-live", "weaver-self"].sort()
    )
  })

  it("lineOrder does not hide or seed lines", () => {
    const board = prepareRailArrivals({
      data: [bakerlooNorth],
      lines: oxfordLines,
      lineOrder: ["victoria", "jubilee"],
    })
    // jubilee is not a serving line — not seeded. victoria stays (seeded empty).
    assert.deepEqual(groupNames(board.groups), [
      "Victoria",
      "Central",
      "Bakerloo",
    ])
    assert.equal(
      board.groups.find((g) => g.lineId === "victoria")?.hasInformation,
      false
    )
    assert.equal(
      board.groups.find((g) => g.lineId === "bakerloo")?.hasInformation,
      true
    )
  })
})

describe("isExpiredArrivalPrediction", () => {
  const now = Date.parse("2026-08-15T21:00:00Z")

  it("is expired once timeToLive has passed", () => {
    const arrival = prediction({
      id: "expired",
      lineId: "weaver",
      lineName: "Weaver",
      timeToStation: 600,
    })
    assert.equal(
      isExpiredArrivalPrediction(
        { ...arrival, timeToLive: "2026-08-15T20:59:00Z" },
        now
      ),
      true
    )
  })

  it("is not expired while timeToLive is still ahead", () => {
    const arrival = prediction({
      id: "live",
      lineId: "weaver",
      lineName: "Weaver",
      timeToStation: 45,
    })
    assert.equal(
      isExpiredArrivalPrediction(
        { ...arrival, timeToLive: "2026-08-15T21:20:00Z" },
        now
      ),
      false
    )
  })

  it("never drops a row with no timeToLive at all", () => {
    const arrival = prediction({
      id: "no-ttl",
      lineId: "central",
      lineName: "Central",
      timeToStation: 30,
    })
    assert.equal(isExpiredArrivalPrediction(arrival, now), false)
  })
})

describe("prepareBusArrivals", () => {
  const route205 = prediction({
    id: "205-late",
    lineId: "205",
    lineName: "205",
    towards: "Bow Church",
    timeToStation: 400,
  })
  const route9 = prediction({
    id: "9-soon",
    lineId: "9",
    lineName: "9",
    towards: "Hammersmith",
    timeToStation: 30,
  })
  const route18 = prediction({
    id: "18-mid",
    lineId: "18",
    lineName: "18",
    towards: "Euston",
    timeToStation: 90,
  })
  const route9Later = prediction({
    id: "9-later",
    lineId: "9",
    lineName: "9",
    towards: "Aldwych",
    timeToStation: 200,
  })

  it("defaults to a flat list in global arrival-time order", () => {
    const board = prepareBusArrivals({
      data: [route205, route9, route18],
    })
    assert.equal(board.layout, "flat")
    assert.equal(board.groups.length, 0)
    assert.deepEqual(idsOf(board.rows), ["9-soon", "18-mid", "205-late"])
    assert.deepEqual(
      board.rows.map((row) => row.arrival.lineName),
      ["9", "18", "205"]
    )
  })

  it("groups by route with stable natural numeric order when asked", () => {
    const board = prepareBusArrivals({
      data: [route205, route9Later, route18, route9],
      groupBy: "route",
    })
    assert.equal(board.layout, "grouped")
    assert.deepEqual(groupNames(board.groups), ["9", "18", "205"])
  })

  it("sorts grouped rows by time within each route", () => {
    const board = prepareBusArrivals({
      data: [route9Later, route9],
      groupBy: "route",
    })
    assert.deepEqual(idsOf(board.groups[0]?.bounds[0]?.rows ?? []), [
      "9-soon",
      "9-later",
    ])
  })

  it("preserves input order for source policies", () => {
    const flat = prepareBusArrivals({
      data: [route205, route9, route18],
      sortBy: "source",
    })
    assert.deepEqual(idsOf(flat.rows), ["205-late", "9-soon", "18-mid"])

    const grouped = prepareBusArrivals({
      data: [route205, route9Later, route18, route9],
      groupBy: "route",
      sortBy: "source",
      groupSortBy: "source",
    })
    assert.deepEqual(groupNames(grouped.groups), ["205", "9", "18"])
    assert.deepEqual(idsOf(grouped.groups[1]?.bounds[0]?.rows ?? []), [
      "9-later",
      "9-soon",
    ])
  })

  it("keeps equal timeToStation in input order", () => {
    const first = prediction({
      id: "first",
      lineId: "9",
      lineName: "9",
      timeToStation: 45,
    })
    const second = prediction({
      id: "second",
      lineId: "18",
      lineName: "18",
      timeToStation: 45,
    })
    const board = prepareBusArrivals({ data: [first, second] })
    assert.deepEqual(idsOf(board.rows), ["first", "second"])
  })

  it("applies ordering before maxRows on unsorted input", () => {
    const flat = prepareBusArrivals({
      data: [route205, route9, route18],
      maxRows: 2,
    })
    assert.deepEqual(idsOf(flat.rows), ["9-soon", "18-mid"])

    const grouped = prepareBusArrivals({
      data: [route205, route9Later, route18, route9],
      groupBy: "route",
      maxRows: 2,
    })
    assert.deepEqual(groupNames(grouped.groups), ["9", "18", "205"])
    assert.deepEqual(idsOf(grouped.groups[0]?.bounds[0]?.rows ?? []), [
      "9-soon",
      "9-later",
    ])
    assert.equal(grouped.groups[1]?.bounds[0]?.rows.length, 1)
  })

  it("does not mutate the caller's data", () => {
    const data = [route205, route9]
    prepareBusArrivals({ data, maxRows: 1 })
    prepareBusArrivals({ data, groupBy: "route", maxRows: 1 })
    assert.equal(data[0], route205)
    assert.equal(data[1], route9)
    assert.deepEqual(
      data.map((row) => row.id),
      ["205-late", "9-soon"]
    )
  })
})

describe("arrivalIdentityKey", () => {
  const base = prediction({
    id: "pred-1",
    lineId: "central",
    lineName: "Central",
    platformName: "Westbound - Platform 1",
    timeToStation: 90,
    vehicleId: "123",
  })

  it("is unchanged when countdown, timestamp, or location change", () => {
    const first = {
      ...base,
      timeToStation: 90,
      timestamp: "2026-08-17T19:00:00Z",
      currentLocation: "At Oxford Circus",
    }
    const second = {
      ...base,
      timeToStation: 30,
      timestamp: "2026-08-17T19:01:00Z",
      currentLocation: "Between Bond Street and Oxford Circus",
    }
    assert.equal(arrivalIdentityKey(first), arrivalIdentityKey(second))
  })

  it("is a pure function of fields — reappearance matches the original key", () => {
    const original = arrivalIdentityKey(base)
    const clone = { ...base }
    assert.equal(arrivalIdentityKey(clone), original)
  })

  it("ignores shared-track presentation tags", () => {
    const ambiguous = {
      ...base,
      sharedTrackIdentity: {
        confidence: "ambiguous" as const,
        rawLineId: "central",
        rawLineIds: ["central", "circle"],
      },
    }
    const exclusive = {
      ...base,
      sharedTrackIdentity: {
        confidence: "exclusive-segment" as const,
        canonicalLineId: "circle",
        rawLineId: "central",
      },
    }
    assert.equal(arrivalIdentityKey(ambiguous), arrivalIdentityKey(base))
    assert.equal(arrivalIdentityKey(exclusive), arrivalIdentityKey(base))
  })

  it("does not collide when platform, direction, or destination differ", () => {
    const west = {
      ...base,
      direction: "outbound",
      platformName: "Westbound - Platform 1",
      destinationNaptanId: "940GZZLUEPG",
    }
    const east = {
      ...base,
      direction: "inbound",
      platformName: "Eastbound - Platform 2",
      destinationNaptanId: "940GZZLUEBY",
    }
    assert.notEqual(arrivalIdentityKey(west), arrivalIdentityKey(east))
  })
})

describe("prepared row identity", () => {
  it("keeps the same key when input order changes", () => {
    const soon = prediction({
      id: "soon",
      lineId: "central",
      platformName: "Westbound - Platform 1",
      timeToStation: 20,
      vehicleId: "101",
    })
    const later = prediction({
      id: "later",
      lineId: "central",
      platformName: "Westbound - Platform 1",
      timeToStation: 80,
      vehicleId: "202",
    })
    const first = prepareRailArrivals({ data: [later, soon] })
    const second = prepareRailArrivals({ data: [soon, later] })
    const keyById = (board: ReturnType<typeof prepareRailArrivals>) =>
      Object.fromEntries(board.rows.map((row) => [row.arrival.id, row.key]))
    assert.deepEqual(keyById(first), keyById(second))
    assert.notEqual(first.rows[0]?.key, first.rows[1]?.key)
  })

  it("gives distinct keys when TfL repeats id but trip or vehicle differs", () => {
    const first = {
      ...prediction({
        id: "shared",
        lineId: "central",
        platformName: "Westbound - Platform 1",
        timeToStation: 40,
        vehicleId: "101",
      }),
      tripId: "trip-a",
    }
    const second = {
      ...prediction({
        id: "shared",
        lineId: "central",
        platformName: "Westbound - Platform 1",
        timeToStation: 80,
        vehicleId: "202",
      }),
      tripId: "trip-b",
    }
    const board = prepareRailArrivals({ data: [first, second] })
    const keys = board.rows.map((row) => row.key)
    assert.equal(keys.length, 2)
    assert.equal(new Set(keys).size, 2)
  })

  it("keeps a shared-track row's key when the tag changes", () => {
    const raw = prediction({
      id: "hc-406",
      lineId: "hammersmith-city",
      lineName: "Hammersmith & City",
      platformName: "Westbound - Platform 2",
      timeToStation: 80,
      vehicleId: "406",
    })
    const tagged = {
      ...raw,
      sharedTrackIdentity: {
        confidence: "exclusive-segment" as const,
        canonicalLineId: "circle",
        rawLineId: "hammersmith-city",
      },
    }
    const first = prepareRailArrivals({ data: [raw] })
    const second = prepareRailArrivals({ data: [tagged] })
    assert.equal(first.rows[0]?.key, second.rows[0]?.key)
  })

  it("keeps fully identical predictions as separate rows", () => {
    const first = {
      ...prediction({
        id: "dup",
        lineId: "dlr",
        platformName: "Eastbound - Platform 1",
        timeToStation: 120,
      }),
      expectedArrival: "2026-08-17T19:02:00Z",
    }
    const second = { ...first, timeToStation: 240 }
    const board = prepareRailArrivals({ data: [first, second] })
    const keys = board.rows.map((row) => row.key)
    assert.equal(keys.length, 2)
    assert.equal(new Set(keys).size, 2)
  })
})

describe("sliceBoundPage", () => {
  const rows = [0, 1, 2, 3, 4].map((index) => ({
    key: `r-${index}`,
    arrival: { id: `r-${index}` } as RealtimePrediction,
    sourceIndex: index,
  }))

  it("returns every row when the page is large enough", () => {
    const sliced = sliceBoundPage(rows, 0, 8)
    assert.equal(sliced.pageCount, 1)
    assert.equal(sliced.page, 0)
    assert.equal(sliced.dashCount, 0)
    assert.equal(sliced.showEndMessage, false)
    assert.deepEqual(
      sliced.rows.map((row) => row.key),
      ["r-0", "r-1", "r-2", "r-3", "r-4"]
    )
  })

  it("pages and clamps an out-of-range page", () => {
    const sliced = sliceBoundPage(rows, 9, 2)
    assert.equal(sliced.pageCount, 3)
    assert.equal(sliced.page, 2)
    assert.equal(sliced.dashCount, 0)
    assert.equal(sliced.showEndMessage, false)
    assert.deepEqual(
      sliced.rows.map((row) => row.key),
      ["r-4"]
    )
  })

  it("fills a locked short single page with a dash and the end message", () => {
    const sliced = sliceBoundPage(rows.slice(0, 1), 0, 3, true)
    assert.equal(sliced.pageCount, 1)
    assert.equal(sliced.rows.length, 1)
    assert.equal(sliced.dashCount, 1)
    assert.equal(sliced.showEndMessage, true)
  })

  it("leaves a short single page natural when height is not locked", () => {
    const sliced = sliceBoundPage(rows.slice(0, 1), 0, 3)
    assert.equal(sliced.pageCount, 1)
    assert.equal(sliced.dashCount, 0)
    assert.equal(sliced.showEndMessage, false)
    assert.equal(sliced.rows.length, 1)
  })

  it("fills a locked short last page with the end message", () => {
    const sliced = sliceBoundPage(rows, 1, 3, true)
    assert.equal(sliced.pageCount, 2)
    assert.equal(sliced.dashCount, 0)
    assert.equal(sliced.showEndMessage, true)
    assert.deepEqual(
      sliced.rows.map((row) => row.key),
      ["r-3", "r-4"]
    )
  })

  it("fills an empty locked page with dashes and no end message", () => {
    const sliced = sliceBoundPage([], 0, 3, true)
    assert.equal(sliced.pageCount, 1)
    assert.equal(sliced.rows.length, 0)
    assert.equal(sliced.dashCount, 2)
    assert.equal(sliced.showEndMessage, false)
  })

  it("does not spare a tile for the end message when pageSize is 1", () => {
    const sliced = sliceBoundPage(rows.slice(0, 1), 0, 1, true)
    assert.equal(sliced.dashCount, 0)
    assert.equal(sliced.showEndMessage, false)
    assert.equal(sliced.rows.length, 1)
  })
})

describe("chunkBoundPages", () => {
  const rows = [0, 1, 2, 3, 4].map((index) => ({
    key: `r-${index}`,
    arrival: { id: `r-${index}` } as RealtimePrediction,
    sourceIndex: index,
  }))

  it("returns a single unpadded page when everything fits and height is unlocked", () => {
    const chunked = chunkBoundPages(rows, 8)
    assert.equal(chunked.pageCount, 1)
    assert.equal(chunked.pages.length, 1)
    assert.equal(chunked.pages[0]?.dashCount, 0)
    assert.equal(chunked.pages[0]?.showEndMessage, false)
    assert.deepEqual(
      chunked.pages[0]?.rows.map((row) => row.key),
      ["r-0", "r-1", "r-2", "r-3", "r-4"]
    )
  })

  it("chunks every page and fills the short last page when locked", () => {
    const chunked = chunkBoundPages(rows, 2, { lockHeight: true })
    assert.equal(chunked.pageCount, 3)
    assert.equal(chunked.pages.length, 3)
    assert.deepEqual(
      chunked.pages.map((page) => page.rows.map((row) => row.key)),
      [["r-0", "r-1"], ["r-2", "r-3"], ["r-4"]]
    )
    assert.deepEqual(
      chunked.pages.map((page) => page.dashCount),
      [0, 0, 0]
    )
    assert.deepEqual(
      chunked.pages.map((page) => page.showEndMessage),
      [false, false, true]
    )
  })

  it("locks a short single page when lockHeight is true", () => {
    const chunked = chunkBoundPages(rows.slice(0, 1), 3, { lockHeight: true })
    assert.equal(chunked.pageCount, 1)
    assert.equal(chunked.pages[0]?.rows.length, 1)
    assert.equal(chunked.pages[0]?.dashCount, 1)
    assert.equal(chunked.pages[0]?.showEndMessage, true)
  })

  it("keeps a short single page natural when lockHeight is when-paged", () => {
    const chunked = chunkBoundPages(rows.slice(0, 1), 3, {
      lockHeight: "when-paged",
    })
    assert.equal(chunked.pageCount, 1)
    assert.equal(chunked.pages[0]?.dashCount, 0)
    assert.equal(chunked.pages[0]?.showEndMessage, false)
  })

  it("locks the last page when when-paged and pageCount is greater than 1", () => {
    const chunked = chunkBoundPages(rows, 3, { lockHeight: "when-paged" })
    assert.equal(chunked.pageCount, 2)
    assert.equal(chunked.pages[0]?.showEndMessage, false)
    assert.equal(chunked.pages[1]?.rows.length, 2)
    assert.equal(chunked.pages[1]?.dashCount, 0)
    assert.equal(chunked.pages[1]?.showEndMessage, true)
  })

  it("does not add a terminal page for an exact multiple", () => {
    const chunked = chunkBoundPages(rows.slice(0, 4), 2, { lockHeight: true })
    assert.equal(chunked.pageCount, 2)
    assert.ok(chunked.pages.every((page) => page.showEndMessage === false))
    assert.ok(chunked.pages.every((page) => page.dashCount === 0))
  })
})

describe("applyRailLeftoverStatus", () => {
  const leftover = {
    label: "Severe Delays",
    sentence: "Expect longer waits.",
  }
  const minor = {
    label: "Minor Delays",
    sentence: "Expect longer waits.",
  }
  const fiveRows = [0, 1, 2, 3, 4].map((index) => ({
    key: `r-${index}`,
    arrival: { id: `r-${index}` } as RealtimePrediction,
    sourceIndex: index,
  }))
  const sixRows = [0, 1, 2, 3, 4, 5].map((index) => ({
    key: `r-${index}`,
    arrival: { id: `r-${index}` } as RealtimePrediction,
    sourceIndex: index,
  }))

  it("puts leftover in the last spare instead of the end message", () => {
    const chunked = chunkBoundPages(fiveRows, 3, { lockHeight: true })
    const pages = applyRailLeftoverStatus(chunked.pages, leftover, true)
    assert.equal(pages.length, 2)
    assert.equal(pages[1]?.showEndMessage, false)
    assert.deepEqual(pages[1]?.leftover, leftover)
    assert.deepEqual(
      pages.flatMap((page) => page.rows.map((row) => row.key)),
      ["r-0", "r-1", "r-2", "r-3", "r-4"]
    )
  })

  it("adds a following leftover page when the last page is full and high-signal", () => {
    const chunked = chunkBoundPages(sixRows, 3, { lockHeight: true })
    const pages = applyRailLeftoverStatus(chunked.pages, leftover, true)
    assert.equal(pages.length, 3)
    assert.equal(pages[2]?.rows.length, 0)
    assert.equal(pages[2]?.dashCount, 2)
    assert.equal(pages[2]?.showEndMessage, false)
    assert.deepEqual(pages[2]?.leftover, leftover)
    assert.deepEqual(
      pages.flatMap((page) => page.rows.map((row) => row.key)),
      ["r-0", "r-1", "r-2", "r-3", "r-4", "r-5"]
    )
  })

  it("does not add a page for delay-only leftover when the last page is full", () => {
    const chunked = chunkBoundPages(sixRows, 3, { lockHeight: true })
    const pages = applyRailLeftoverStatus(chunked.pages, minor, false)
    assert.equal(pages.length, 2)
    assert.ok(pages.every((page) => page.leftover === undefined))
    assert.deepEqual(
      pages.flatMap((page) => page.rows.map((row) => row.key)),
      ["r-0", "r-1", "r-2", "r-3", "r-4", "r-5"]
    )
  })

  it("puts delay-only leftover in an already-spare last slot", () => {
    const chunked = chunkBoundPages(fiveRows, 3, { lockHeight: true })
    const pages = applyRailLeftoverStatus(chunked.pages, minor, false)
    assert.equal(pages.length, 2)
    assert.equal(pages[1]?.showEndMessage, false)
    assert.deepEqual(pages[1]?.leftover, minor)
    assert.deepEqual(
      pages.flatMap((page) => page.rows.map((row) => row.key)),
      ["r-0", "r-1", "r-2", "r-3", "r-4"]
    )
  })

  it("does not apply leftover to an empty board", () => {
    const chunked = chunkBoundPages([], 3, { lockHeight: true })
    const pages = applyRailLeftoverStatus(chunked.pages, leftover, true)
    assert.equal(pages.length, 1)
    assert.equal(pages[0]?.leftover, undefined)
    assert.equal(pages[0]?.rows.length, 0)
    assert.equal(pages[0]?.showEndMessage, false)
  })
})
