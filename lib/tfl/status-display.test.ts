import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { partitionStatusBoardLines } from "@/lib/tfl/status-board"
import {
  allocateStatusStripRegions,
  buildStatusDisplayFrames,
} from "@/lib/tfl/status-display"
import type { StatusLine } from "@/lib/tfl/status-types"

const SATURDAY = Date.parse("2026-08-15T16:30:00Z")

const line = (
  id: string,
  name: string,
  severity: number,
  description: string,
  reason?: string
): StatusLine => ({
  id,
  name,
  modeName: "tube",
  lineStatuses: [
    {
      statusSeverity: severity,
      statusSeverityDescription: description,
      reason,
      disruption: { category: severity >= 10 ? "Information" : "RealTime" },
      validityPeriods: [{ isNow: true }],
    },
  ],
})

const central = line(
  "central",
  "Central",
  6,
  "Severe Delays",
  "Central Line: Severe delays between Leytonstone and Liverpool Street. Valid tickets are accepted on local buses."
)
const bakerloo = line("bakerloo", "Bakerloo", 10, "Good Service")
const victoria = line("victoria", "Victoria", 10, "Good Service")
const waterlooCity: StatusLine = {
  id: "waterloo-city",
  name: "Waterloo & City",
  modeName: "tube",
  lineStatuses: [
    {
      statusSeverity: 20,
      statusSeverityDescription: "Service Closed",
      reason: "Waterloo and City Line: Service will resume at 06:00 on Monday.",
      disruption: { category: "RealTime" },
      validityPeriods: [{ isNow: true }],
    },
  ],
}

describe("buildStatusDisplayFrames", () => {
  it("stays in Good service when every line is good", () => {
    const sections = partitionStatusBoardLines([bakerloo, victoria], {
      now: SATURDAY,
    })
    const frames = buildStatusDisplayFrames(sections, { tiles: 4 })
    assert.ok(frames.length >= 1)
    assert.ok(frames.every((frame) => frame.phase === "good-service"))
    assert.equal(frames[0]?.heading, "Good service")
  })

  it("loops disruptions without an empty Good service phase", () => {
    const sections = partitionStatusBoardLines([central, waterlooCity], {
      now: SATURDAY,
    })
    const frames = buildStatusDisplayFrames(sections, { tiles: 4 })
    assert.ok(frames.length >= 1)
    assert.ok(frames.every((frame) => frame.phase === "disruptions"))
  })

  it("rotates one disruption then Good service", () => {
    const sections = partitionStatusBoardLines(
      [central, bakerloo, victoria],
      { now: SATURDAY }
    )
    const frames = buildStatusDisplayFrames(sections, { tiles: 4 })
    assert.equal(frames[0]?.phase, "disruptions")
    assert.equal(frames[0]?.heading, "Service disruptions")
    assert.equal(frames[0]?.activeLineId, "central")
    assert.ok(frames.some((frame) => frame.phase === "good-service"))
  })

  it("keeps timetable-closed lines in disruptions", () => {
    const sections = partitionStatusBoardLines([waterlooCity, victoria], {
      now: SATURDAY,
    })
    const frames = buildStatusDisplayFrames(sections, { tiles: 4 })
    const disruption = frames.find((frame) => frame.phase === "disruptions")
    assert.equal(disruption?.activeLineId, "waterloo-city")
  })

  it("uses a one-tile summary with no reason copy", () => {
    const sections = partitionStatusBoardLines([central, bakerloo], {
      now: SATURDAY,
    })
    const frames = buildStatusDisplayFrames(sections, { tiles: 1 })
    assert.equal(frames[0]?.tiles.length, 0)
    assert.equal(frames[0]?.heading, "Service disruptions")
    assert.ok(!frames[0]?.tiles.some((tile) => tile.kind === "text"))
  })

  it("splits long reasons across further frames", () => {
    const sections = partitionStatusBoardLines([central], { now: SATURDAY })
    const frames = buildStatusDisplayFrames(sections, {
      tiles: 3,
      charsPerTile: 40,
    })
    const texts = frames
      .filter((frame) => frame.phase === "disruptions")
      .flatMap((frame) =>
        frame.tiles.filter((tile) => tile.kind === "text").map((tile) => tile.text)
      )
    assert.ok(texts.length >= 1)
    assert.ok(frames[0]?.tiles.some((tile) => tile.kind === "line"))
  })

  it("scopes network summary to every fetched line and detail to the filter", () => {
    const sections = partitionStatusBoardLines(
      [central, bakerloo, victoria],
      { now: SATURDAY }
    )
    const frames = buildStatusDisplayFrames(sections, {
      tiles: 4,
      detailScope: "network",
      detailLineIds: ["central"],
    })
    const disruption = frames.find((frame) => frame.phase === "disruptions")
    assert.deepEqual(disruption?.headingLineIds, ["central"])
    assert.equal(
      disruption?.otherGoodServiceCopy,
      "Good service on all other lines"
    )
    assert.ok(!frames.some((frame) => frame.phase === "good-service"))
  })

  it("scopes selection to the selected lines only", () => {
    const sections = partitionStatusBoardLines(
      [central, bakerloo, victoria],
      { now: SATURDAY }
    )
    const frames = buildStatusDisplayFrames(sections, {
      tiles: 4,
      detailScope: "selection",
      detailLineIds: ["victoria"],
    })
    assert.ok(frames.every((frame) => frame.phase === "good-service"))
    assert.deepEqual(frames[0]?.headingLineIds, ["victoria"])
    assert.equal(frames[0]?.otherGoodServiceCopy, undefined)
  })

  it("omits heading chips when overview is none", () => {
    const sections = partitionStatusBoardLines([central, bakerloo], {
      now: SATURDAY,
    })
    const frames = buildStatusDisplayFrames(sections, {
      tiles: 4,
      detailScope: "none",
      detailLineIds: ["central"],
    })
    assert.equal(frames[0]?.heading, "Central")
    assert.deepEqual(frames[0]?.headingLineIds, [])
  })
})

describe("allocateStatusStripRegions", () => {
  it("keeps a two-unit strip on identity and reason", () => {
    assert.deepEqual(allocateStatusStripRegions(2), {
      showDisruptedSummary: false,
      showOtherSummary: false,
      reasonUnits: 2,
    })
  })

  it("adds both summaries at four or more units", () => {
    assert.deepEqual(allocateStatusStripRegions(4), {
      showDisruptedSummary: true,
      showOtherSummary: true,
      reasonUnits: 2,
    })
  })
})
