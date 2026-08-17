import assert from "node:assert/strict"
import { describe, it } from "node:test"
import type { LineString } from "geojson"
import type { RealtimePrediction } from "tfl-ts"
import {
  advanceVehiclePosition,
  locateVehicles,
} from "@/lib/tfl/vehicle-positions"

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

/**
 * Eastbound line along 51.5°N with room behind station A so dead
 * reckoning has track to walk backward onto (real lines extend past
 * every station; this mirrors that).
 */
const EAST_LINE: LineString = {
  type: "LineString",
  coordinates: [
    [-0.16, 51.5],
    [-0.14, 51.5],
    [-0.13, 51.5],
  ],
}

const STATIONS = new Map([
  ["A", { lat: 51.5, lon: -0.14 }],
  ["B", { lat: 51.5, lon: -0.13 }],
])

describe("locateVehicles", () => {
  it("places a vehicle exactly on the stop when it is arriving now", () => {
    const [position] = locateVehicles({
      predictions: [
        prediction({
          vehicleId: "241",
          naptanId: "A",
          timeToStation: 0,
        }),
      ],
      stationsById: STATIONS,
      polylines: [EAST_LINE],
    })
    assert.ok(position)
    assert.equal(position.lat, 51.5)
    assert.equal(position.lon, -0.14)
    assert.equal(position.vehicleId, "241")
    assert.equal(position.timeToNextStationSec, 0)
  })

  it("walks backward from the next stop using the assumed line speed", () => {
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
    // Behind A (further from B), never past it.
    assert.ok(position.lon < -0.14)
    assert.ok(Math.abs(position.lat - 51.5) < 0.0008)
    assert.ok(position.bearingDeg > 70 && position.bearingDeg < 110)
  })

  it("keeps moving even when the ETA is far larger than the next hop's gap", () => {
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
    // A distant vehicle should not be frozen exactly on the next stop.
    assert.notEqual(position.lon, -0.14)
    assert.ok(position.lon < -0.14)
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

describe("advanceVehiclePosition", () => {
  it("walks along the hop as time-to-station elapses", () => {
    const [placed] = locateVehicles({
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
      asOf: 1_000,
    })
    assert.ok(placed)
    const later = advanceVehiclePosition(placed, 1_000 + 15_000, [EAST_LINE])
    assert.ok(later.lon > placed.lon)
    assert.ok(later.lon < -0.13)
  })
})
