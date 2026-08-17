import assert from "node:assert/strict"
import { describe, it } from "node:test"
import type { LineString } from "geojson"
import {
  pointBetweenStations,
  progressBetweenStops,
} from "@/lib/tfl/vehicle-progress"

const EAST_LINE: LineString = {
  type: "LineString",
  coordinates: [
    [-0.14, 51.5],
    [-0.13, 51.5],
  ],
}

const FROM = { lat: 51.5, lon: -0.14 }
const TO = { lat: 51.5, lon: -0.13 }

describe("progressBetweenStops", () => {
  it("returns 0.5 when the remaining time is half the following interval", () => {
    assert.equal(progressBetweenStops(30, 90), 0.5)
  })

  it("returns 0 when only the next stop is known", () => {
    assert.equal(progressBetweenStops(40, undefined), 0)
  })

  it("clamps a late vehicle to 0", () => {
    assert.equal(progressBetweenStops(200, 250), 0)
  })
})

describe("pointBetweenStations", () => {
  it("returns the start at progress 0", () => {
    const point = pointBetweenStations({
      from: FROM,
      to: TO,
      progress: 0,
      polylines: [EAST_LINE],
    })
    assert.ok(Math.abs(point.lon - FROM.lon) < 0.0008)
    assert.ok(Math.abs(point.lat - FROM.lat) < 0.0008)
  })

  it("snaps halfway along the polyline at progress 0.5", () => {
    const point = pointBetweenStations({
      from: FROM,
      to: TO,
      progress: 0.5,
      polylines: [EAST_LINE],
    })
    assert.ok(Math.abs(point.lon - -0.135) < 0.0008)
    assert.ok(point.bearingDeg > 70 && point.bearingDeg < 110)
  })
})
