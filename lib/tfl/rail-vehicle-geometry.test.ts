import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  railPolylinesForLine,
  railStationsById,
} from "@/lib/tfl/rail-vehicle-geometry"

describe("railStationsById", () => {
  it("resolves arrival naptans onto hub geometry", () => {
    const stations = railStationsById()
    const victoria = stations.get("940GZZLUVIC")
    const hub = stations.get("HUBVIC")
    assert.ok(victoria)
    assert.ok(hub)
    assert.equal(victoria.lat, hub.lat)
    assert.equal(victoria.lon, hub.lon)
  })
})

describe("railPolylinesForLine", () => {
  it("returns tagged unique-track hops for Victoria", () => {
    const hops = railPolylinesForLine("victoria")
    const tagged = hops.filter((row) => row.fromStationId && row.toStationId)
    assert.ok(tagged.length > 10)
    assert.ok(hops.length > tagged.length)
    assert.ok(tagged.some((row) => (row.hopMinutes ?? 0) > 0))
  })

  it("covers Elizabeth and DLR from unique-track", () => {
    assert.ok(railPolylinesForLine("elizabeth").length > 5)
    assert.ok(railPolylinesForLine("dlr").length > 5)
  })
})
