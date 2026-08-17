import assert from "node:assert/strict"
import { describe, it } from "node:test"
import type { LineString } from "geojson"
import type { RealtimePrediction } from "tfl-ts"
import { locateVehicles } from "@/lib/tfl/vehicle-positions"

const prediction = (fields: {
  vehicleId: string
  naptanId: string
  timeToStation: number
  lineId?: string
  destinationName?: string
}): RealtimePrediction =>
  ({
    lineId: fields.lineId ?? "victoria",
    destinationName: fields.destinationName ?? "Brixton",
    ...fields,
  }) as RealtimePrediction

/** Eastbound line along 51.5°N, 0.01° longitude (~0.7 km). */
const EAST_LINE: LineString = {
  type: "LineString",
  coordinates: [
    [-0.14, 51.5],
    [-0.13, 51.5],
  ],
}

const STATIONS = new Map([
  ["A", { lat: 51.5, lon: -0.14 }],
  ["B", { lat: 51.5, lon: -0.13 }],
])

describe("locateVehicles", () => {
  it("places a single remaining prediction on that stop", () => {
    const [position] = locateVehicles({
      predictions: [
        prediction({
          vehicleId: "241",
          naptanId: "A",
          timeToStation: 40,
        }),
      ],
      stationsById: STATIONS,
      polylines: [EAST_LINE],
    })
    assert.ok(position)
    assert.equal(position.lat, 51.5)
    assert.equal(position.lon, -0.14)
    assert.equal(position.vehicleId, "241")
    assert.equal(position.timeToNextStationSec, 40)
  })

  it("interpolates along the polyline between the next two stops", () => {
    const [position] = locateVehicles({
      predictions: [
        prediction({
          vehicleId: "241",
          naptanId: "A",
          timeToStation: 30,
        }),
        prediction({
          vehicleId: "241",
          naptanId: "B",
          timeToStation: 90,
        }),
      ],
      stationsById: STATIONS,
      polylines: [EAST_LINE],
    })
    assert.ok(position)
    // segmentTotal = 60; fraction = (60 - 30) / 60 = 0.5
    assert.ok(Math.abs(position.lon - -0.135) < 0.0008)
    assert.ok(Math.abs(position.lat - 51.5) < 0.0008)
    assert.ok(position.bearingDeg > 70 && position.bearingDeg < 110)
  })

  it("clamps a late vehicle onto the next stop", () => {
    const [position] = locateVehicles({
      predictions: [
        prediction({
          vehicleId: "202",
          naptanId: "A",
          timeToStation: 200,
        }),
        prediction({
          vehicleId: "202",
          naptanId: "B",
          timeToStation: 250,
        }),
      ],
      stationsById: STATIONS,
      polylines: [EAST_LINE],
    })
    assert.ok(position)
    assert.ok(Math.abs(position.lon - -0.14) < 0.0008)
  })

  it("skips predictions without a known station", () => {
    const positions = locateVehicles({
      predictions: [
        prediction({
          vehicleId: "999",
          naptanId: "UNKNOWN",
          timeToStation: 10,
        }),
      ],
      stationsById: STATIONS,
      polylines: [EAST_LINE],
    })
    assert.equal(positions.length, 0)
  })
})
