import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { hopCoverage } from "@/lib/tfl/homepage-live/hop-coverage"
import { ETA_ONLY_LINES, PLACED_LINES } from "@/lib/tfl/homepage-live/engine"
import { positionBehindStop } from "@/lib/tfl/vehicle-progress"

const LINES = [...PLACED_LINES, ...ETA_ONLY_LINES, "circle", "hammersmith-city", "metropolitan", "waterloo-city"]

describe("hop coverage of every active route", () => {
  it("can draw a train on every hop of every line", () => {
    for (const line of LINES) {
      const c = hopCoverage(line)
      assert.deepEqual(c.undrawable, [], `${line} has hops with no station coordinates`)
      assert.equal(c.onTrack + c.straight, c.hops)
    }
  })

  it("keeps the straight-segment share of a line below two fifths", () => {
    for (const line of LINES) {
      const c = hopCoverage(line)
      assert.ok(c.straight / c.hops < 0.4, `${line} ${c.straight}/${c.hops} hops are straight segments`)
    }
  })
})

describe("a hop with no track polyline", () => {
  const from = { lat: 51.5, lon: -0.2 }
  const next = { lat: 51.5, lon: -0.19 }
  const args = {
    nextStop: next,
    fromStop: from,
    polylines: [],
    fromStopId: "A",
    toStopId: "B",
    straightFallback: true,
  }

  it("places the train on the segment between its two stations", () => {
    const half = positionBehindStop({ ...args, remainingKm: 0.35 })
    assert.ok(half.lon > from.lon && half.lon < next.lon)
    assert.equal(half.lat, 51.5)
  })

  it("lands on the next stop with nothing left to run, and never goes behind the last one", () => {
    const arrived = positionBehindStop({ ...args, remainingKm: 0 })
    assert.ok(Math.abs(arrived.lon - next.lon) < 1e-9)
    const early = positionBehindStop({ ...args, remainingKm: 50 })
    assert.ok(Math.abs(early.lon - from.lon) < 1e-9)
  })
})
