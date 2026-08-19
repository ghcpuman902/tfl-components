import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  assessObservation,
  confirmAssessments,
} from "@/lib/tfl/observatory/assess"
import { judgeCompleteness } from "@/lib/tfl/observatory/completeness"
import { diffCanonical, emptyResponseSummary } from "@/lib/tfl/observatory/diff"
import { cataloguePayload, stopsPayload } from "@/lib/tfl/observatory/normalise"
import type { CanonicalPayload } from "@/lib/tfl/observatory/types"

const districtStops = (names: [string, string][]): CanonicalPayload =>
  stopsPayload(
    "district",
    names.map(([id, name]) => ({ id, name }))
  )

const manyStops = (count: number): CanonicalPayload =>
  districtStops(
    Array.from({ length: count }, (_, index) => [
      `stop-${String(index).padStart(2, "0")}`,
      `Stop ${index}`,
    ])
  )

describe("empty-response protection", () => {
  it("treats an empty stop list as unavailable, not a change", () => {
    const result = assessObservation({
      baseline: manyStops(20),
      observed: districtStops([]),
      rawCount: 0,
      validCount: 0,
      context: { lineId: "district", lineName: "District", modeName: "tube" },
    })
    assert.equal(result.state, "unavailable")
    assert.equal(result.shouldUpdateBaseline, false)
    assert.equal(
      result.summary,
      "TfL returned no stop points for the District line."
    )
  })

  it("treats a dramatic reduction as incomplete", () => {
    const verdict = judgeCompleteness({
      rawCount: 4,
      validCount: 4,
      baselineCount: 20,
    })
    assert.equal(verdict.reason, "incomplete")

    const result = assessObservation({
      baseline: manyStops(20),
      observed: manyStops(4),
      rawCount: 4,
      validCount: 4,
      context: { lineId: "district", lineName: "District", modeName: "tube" },
    })
    assert.equal(result.state, "incomplete")
    assert.equal(result.shouldUpdateBaseline, false)
  })

  it("treats a malformed payload as incomplete", () => {
    const result = assessObservation({
      baseline: manyStops(8),
      observed: null,
      failure: "malformed",
      rawCount: 8,
      validCount: 0,
      context: { lineId: "district", lineName: "District", modeName: "tube" },
    })
    assert.equal(result.state, "incomplete")
    assert.equal(result.shouldUpdateBaseline, false)
  })

  it("does not treat a small-set loss as incomplete", () => {
    const verdict = judgeCompleteness({
      rawCount: 2,
      validCount: 2,
      baselineCount: 3,
    })
    assert.equal(verdict.reason, null)
  })
})

describe("change detection", () => {
  it("describes two added stop points", () => {
    const previous = districtStops([
      ["940GZZLUEMB", "Embankment"],
      ["940GZZLUVIC", "Victoria"],
    ])
    const next = districtStops([
      ["940GZZLUEMB", "Embankment"],
      ["940GZZLUVIC", "Victoria"],
      ["940GZZLUTMP", "Temple"],
      ["940GZZLUBKF", "Blackfriars"],
    ])
    const diff = diffCanonical(previous, next, {
      lineName: "District",
      modeName: "tube",
    })
    assert.match(diff.summary, /2 stop points added on the District line/)
  })

  it("describes one station rename", () => {
    const previous = districtStops([["940GZZLUSJW", "St John's Wood"]])
    const next = districtStops([["940GZZLUSJW", "St. John's Wood"]])
    const diff = diffCanonical(previous, next, {
      lineName: "Jubilee",
      modeName: "tube",
    })
    assert.match(diff.summary, /1 stop point renamed on the Jubilee line/)
  })

  it("describes a route branch change", () => {
    const previous: CanonicalPayload = {
      kind: "route-sequence",
      lineId: "northern",
      direction: "outbound",
      branches: [
        {
          name: "Morden via Bank",
          serviceType: "Regular",
          naptanIds: ["A", "B"],
        },
      ],
    }
    const next: CanonicalPayload = {
      kind: "route-sequence",
      lineId: "northern",
      direction: "outbound",
      branches: [
        {
          name: "Morden via Bank",
          serviceType: "Regular",
          naptanIds: ["A", "C", "B"],
        },
      ],
    }
    const diff = diffCanonical(previous, next, {
      lineName: "Northern",
      modeName: "tube",
    })
    assert.match(diff.summary, /a route or branch changed/)
  })

  it("marks a plausible addition as suspect, not unavailable", () => {
    const result = assessObservation({
      baseline: manyStops(20),
      observed: manyStops(22),
      rawCount: 22,
      validCount: 22,
      context: { lineId: "district", lineName: "District", modeName: "tube" },
    })
    assert.equal(result.state, "suspect")
    assert.equal(result.shouldUpdateBaseline, false)
    assert.match(result.summary, /2 stop points added/)
  })
})

describe("state transitions", () => {
  it("establishes a baseline from the first complete observation", () => {
    const result = assessObservation({
      baseline: null,
      observed: cataloguePayload([
        {
          id: "victoria",
          name: "Victoria",
          modeName: "tube",
          serviceTypes: [],
        },
      ]),
      rawCount: 1,
      validCount: 1,
      context: {},
    })
    assert.equal(result.state, "current")
    assert.equal(result.shouldUpdateBaseline, true)
  })

  it("confirms a matching suspect observation as changed", () => {
    const baseline = manyStops(20)
    const observed = manyStops(22)
    const first = assessObservation({
      baseline,
      observed,
      rawCount: 22,
      validCount: 22,
      context: { lineId: "district", lineName: "District", modeName: "tube" },
    })
    const second = assessObservation({
      baseline,
      observed,
      rawCount: 22,
      validCount: 22,
      context: { lineId: "district", lineName: "District", modeName: "tube" },
    })
    const confirmed = confirmAssessments(first, second, observed)
    assert.equal(first.state, "suspect")
    assert.equal(confirmed.state, "changed")
    assert.equal(confirmed.shouldUpdateBaseline, true)
  })

  it("returns to current when a suspected change does not confirm", () => {
    const baseline = manyStops(20)
    const first = assessObservation({
      baseline,
      observed: manyStops(22),
      rawCount: 22,
      validCount: 22,
      context: { lineId: "district", lineName: "District", modeName: "tube" },
    })
    const second = assessObservation({
      baseline,
      observed: baseline,
      rawCount: 20,
      validCount: 20,
      context: { lineId: "district", lineName: "District", modeName: "tube" },
    })
    const confirmed = confirmAssessments(first, second, baseline)
    assert.equal(confirmed.state, "current")
    assert.equal(confirmed.shouldUpdateBaseline, false)
  })

  it("keeps the baseline when confirmation is empty", () => {
    const baseline = manyStops(20)
    const first = assessObservation({
      baseline,
      observed: manyStops(22),
      rawCount: 22,
      validCount: 22,
      context: { lineId: "district", lineName: "District", modeName: "tube" },
    })
    const second = assessObservation({
      baseline,
      observed: districtStops([]),
      rawCount: 0,
      validCount: 0,
      context: { lineId: "district", lineName: "District", modeName: "tube" },
    })
    const confirmed = confirmAssessments(first, second, districtStops([]))
    assert.equal(confirmed.state, "unavailable")
    assert.equal(confirmed.shouldUpdateBaseline, false)
  })

  it("writes the District empty-response sentence", () => {
    assert.equal(
      emptyResponseSummary("stop-points", {
        lineId: "district",
        lineName: "District",
        modeName: "tube",
      }),
      "TfL returned no stop points for the District line."
    )
  })
})
