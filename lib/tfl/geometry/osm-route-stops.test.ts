import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { mergeOsmStationPositions, type OsmRouteStop } from "./osm-route-stops"
import type { TrackStation } from "./transit-track-graph"

describe("mergeOsmStationPositions", () => {
  it("prefers the OSM stop position when the name matches", () => {
    const tflStations: TrackStation[] = [
      {
        id: "910GWCHAPXR",
        name: "Whitechapel Rail Station",
        label: "Whitechapel",
        coordinates: [-0.06, 51.52],
      },
    ]
    const osmStops: OsmRouteStop[] = [
      { nodeId: 1, name: "Whitechapel", coordinates: [-0.0599, 51.5195] },
    ]
    const [merged] = mergeOsmStationPositions(tflStations, osmStops)
    assert.deepEqual(merged!.coordinates, [-0.0599, 51.5195])
    assert.equal(merged!.id, "910GWCHAPXR")
  })

  it("averages multiple platform-specific stop nodes for the same station", () => {
    const tflStations: TrackStation[] = [
      {
        id: "a",
        name: "Custom House",
        label: "Custom House",
        coordinates: [0, 0],
      },
    ]
    const osmStops: OsmRouteStop[] = [
      { nodeId: 1, name: "Custom House", coordinates: [0.02, 51.518] },
      { nodeId: 2, name: "Custom House", coordinates: [0.026, 51.5195] },
    ]
    const [merged] = mergeOsmStationPositions(tflStations, osmStops)
    assert.ok(Math.abs(merged!.coordinates[0] - 0.023) < 1e-6)
  })

  it("keeps an OSM stop with no TfL match instead of dropping it", () => {
    const osmStops: OsmRouteStop[] = [
      { nodeId: 1, name: "Canary Wharf", coordinates: [-0.019, 51.5037] },
    ]
    const merged = mergeOsmStationPositions([], osmStops)
    assert.equal(merged.length, 1)
    assert.equal(merged[0]!.name, "Canary Wharf")
  })

  it("normalises London-prefixed and rail-station-suffixed names to match", () => {
    const tflStations: TrackStation[] = [
      {
        id: "910GLIVST",
        name: "London Liverpool Street Rail Station",
        label: "Liverpool Street",
        coordinates: [0, 0],
      },
    ]
    const osmStops: OsmRouteStop[] = [
      { nodeId: 1, name: "Liverpool Street", coordinates: [-0.0817, 51.5178] },
    ]
    const merged = mergeOsmStationPositions(tflStations, osmStops)
    assert.equal(merged.length, 1)
    assert.deepEqual(merged[0]!.coordinates, [-0.0817, 51.5178])
  })
})
