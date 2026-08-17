import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { railStationsById } from "@/lib/tfl/rail-vehicle-geometry"

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
