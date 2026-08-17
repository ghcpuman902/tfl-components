import assert from "node:assert/strict"
import { describe, it } from "node:test"
import type { LineString } from "geojson"
import {
  pointBetweenStations,
  positionApproachingStop,
  progressBetweenStops,
  segmentAroundPoint,
  vehicleLengthMeters,
  vehicleSpeedMetersPerSec,
} from "@/lib/tfl/vehicle-progress"

const EAST_LINE: LineString = {
  type: "LineString",
  coordinates: [
    [-0.14, 51.5],
    [-0.13, 51.5],
  ],
}

/** Room behind station A for dead reckoning to walk backward onto. */
const LONG_EAST_LINE: LineString = {
  type: "LineString",
  coordinates: [
    [-0.16, 51.5],
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

describe("positionApproachingStop", () => {
  it("lands exactly on the next stop at zero ETA", () => {
    const point = positionApproachingStop({
      nextStop: { lat: 51.5, lon: -0.14 },
      followingStop: { lat: 51.5, lon: -0.13 },
      timeToNextSec: 0,
      speedMetersPerSec: 8.5,
      polylines: [LONG_EAST_LINE],
    })
    assert.ok(Math.abs(point.lon - -0.14) < 0.0001)
    assert.ok(Math.abs(point.lat - 51.5) < 0.0001)
  })

  it("keeps moving toward the stop as ETA shrinks, however large it started", () => {
    const far = positionApproachingStop({
      nextStop: { lat: 51.5, lon: -0.14 },
      followingStop: { lat: 51.5, lon: -0.13 },
      timeToNextSec: 120,
      speedMetersPerSec: 8.5,
      polylines: [LONG_EAST_LINE],
    })
    const near = positionApproachingStop({
      nextStop: { lat: 51.5, lon: -0.14 },
      followingStop: { lat: 51.5, lon: -0.13 },
      timeToNextSec: 20,
      speedMetersPerSec: 8.5,
      polylines: [LONG_EAST_LINE],
    })
    // Both stay behind the next stop, and the shorter ETA is closer to it.
    assert.ok(far.lon < -0.14)
    assert.ok(near.lon < -0.14)
    assert.ok(near.lon > far.lon)
  })

  it("falls back to the next stop when no polyline is given", () => {
    const point = positionApproachingStop({
      nextStop: { lat: 51.5, lon: -0.14 },
      timeToNextSec: 60,
      speedMetersPerSec: 8.5,
      polylines: [],
    })
    assert.equal(point.lat, 51.5)
    assert.equal(point.lon, -0.14)
  })
})

describe("vehicleSpeedMetersPerSec", () => {
  it("makes Elizabeth faster than Tube stock", () => {
    assert.ok(vehicleSpeedMetersPerSec("elizabeth") > vehicleSpeedMetersPerSec("victoria"))
  })

  it("treats numbered routes as buses", () => {
    assert.equal(vehicleSpeedMetersPerSec("24"), 5)
  })
})

describe("vehicleLengthMeters", () => {
  it("makes Elizabeth longer than Tube stock", () => {
    assert.ok(vehicleLengthMeters("elizabeth") > vehicleLengthMeters("victoria"))
  })

  it("treats numbered routes as buses", () => {
    assert.equal(vehicleLengthMeters("24"), 12)
  })
})

describe("segmentAroundPoint", () => {
  it("follows the polyline and keeps the requested length", () => {
    const segment = segmentAroundPoint({
      at: { lat: 51.5, lon: -0.135 },
      lengthMeters: 200,
      polylines: [EAST_LINE],
    })
    assert.equal(segment.type, "LineString")
    assert.ok(segment.coordinates.length >= 2)
    const [start, end] = [
      segment.coordinates[0],
      segment.coordinates[segment.coordinates.length - 1],
    ]
    assert.ok(start)
    assert.ok(end)
    assert.ok(Math.abs((start[1] ?? 0) - 51.5) < 0.0008)
    assert.ok(Math.abs((end[1] ?? 0) - 51.5) < 0.0008)
    assert.ok((end[0] ?? 0) - (start[0] ?? 0) > 0.0005)
  })
})
