import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  vehiclesToCarriageGeoJSON,
  type VehiclePosition,
} from "@/lib/tfl/map-vehicles"

const train = (vehicleId: string, beta?: boolean): VehiclePosition => ({
  vehicleId,
  lineId: "northern",
  lat: 51.53,
  lon: -0.12,
  bearingDeg: 0,
  destinationName: "Edgware",
  timeToNextStationSec: 60,
  ...(beta ? { beta } : {}),
})

describe("Beta tag on map vehicles", () => {
  it("marks every carriage of an estimated train and no other", () => {
    const { features } = vehiclesToCarriageGeoJSON([train("a", true), train("b")], [])
    const tagged = features.filter((f) => f.properties.beta === true)
    assert.deepEqual([...new Set(tagged.map((f) => f.properties.vehicleId))], ["a"])
    assert.equal(tagged.length, 2)
    assert.ok(features.filter((f) => f.properties.vehicleId === "b").every((f) => !("beta" in f.properties)))
  })
})
