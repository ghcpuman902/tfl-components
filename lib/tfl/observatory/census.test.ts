import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { Lines } from "tfl-ts/dist/generated/meta/Line.js"
import {
  VERIFIED_CENSUS_COUNTS,
  assessCensusCount,
  formatCountDelta,
  previousCensusBaseline,
} from "@/lib/tfl/observatory/census"

describe("verified census snapshot", () => {
  it("keeps bus lines aligned with the tfl-ts Lines snapshot", () => {
    const busLines = Lines.filter((line) => line.modeName === "bus").length
    assert.equal(VERIFIED_CENSUS_COUNTS["bus-lines"], busLines)
  })
})

describe("census count band", () => {
  it("treats an empty or missing count as unavailable", () => {
    const empty = assessCensusCount({ observed: 0, baseline: 641 })
    assert.equal(empty.state, "unavailable")
    const missing = assessCensusCount({ observed: null, baseline: 641 })
    assert.equal(missing.state, "unavailable")
  })

  it("treats a plus-or-minus one as normal and records the delta", () => {
    const added = assessCensusCount({ observed: 642, baseline: 641 })
    assert.equal(added.state, "current")
    assert.equal(added.delta, 1)
    assert.match(added.summary, /\+1/)
    assert.match(added.summary, /normal band/)

    const removed = assessCensusCount({ observed: 32_553, baseline: 32_554 })
    assert.equal(removed.state, "current")
    assert.equal(removed.delta, -1)
  })

  it("treats a swing over 10% as incomplete", () => {
    const high = assessCensusCount({ observed: 720, baseline: 641 })
    assert.equal(high.state, "incomplete")
    assert.match(high.summary, /10%/)

    const low = assessCensusCount({ observed: 500, baseline: 641 })
    assert.equal(low.state, "incomplete")
  })

  it("treats an exact match as current", () => {
    const exact = assessCensusCount({ observed: 798, baseline: 798 })
    assert.equal(exact.state, "current")
    assert.equal(exact.delta, 0)
    assert.equal(formatCountDelta(0), "same")
  })

  it("uses yesterday's successful count, not the seed, on the next run", () => {
    const baseline = previousCensusBaseline(
      {
        id: "bus-points",
        observedCount: 32_560,
        baselineCount: 32_554,
        at: "2026-08-19T04:15:00.000Z",
        state: "current",
        summary: "+6",
      },
      "bus-points"
    )
    assert.equal(baseline, 32_560)
    const next = assessCensusCount({ observed: 32_561, baseline })
    assert.equal(next.state, "current")
    assert.equal(next.delta, 1)
  })
})
