import assert from "node:assert/strict"
import { describe, it } from "node:test"
import type { Feature, LineString } from "geojson"
import tube from "@/data/geography/unique-track/tube/full.json"
import type {
  LineSegmentProperties,
  TransitGeometryBundle,
} from "@/lib/tfl/geography-types"
import {
  hopSegmentsFromBundle,
  hopSegmentsToPolylines,
} from "@/lib/tfl/geometry/rail-hop-segments"
import { contractTrackTopology } from "@/lib/tfl/geometry/contract-track-topology"
import type { LngLat, TrackStation } from "@/lib/tfl/geometry/transit-track-graph"
import { pickHopPolyline } from "@/lib/tfl/vehicle-progress"
import { hopGraphFromOrderedStops } from "@/lib/tfl/vehicle-hop-graph"

const bundle = tube as TransitGeometryBundle

const hopBetween = (
  segments: readonly { fromStationId: string; toStationId: string }[],
  left: string,
  right: string,
) =>
  segments.find(
    (segment) =>
      (segment.fromStationId === left && segment.toStationId === right) ||
      (segment.fromStationId === right && segment.toStationId === left),
  )

const feature = (
  id: string,
  coords: LngLat[],
): Feature<LineString, LineSegmentProperties> => ({
  type: "Feature",
  id,
  properties: {
    featureId: id,
    lineId: "test",
    lineName: "Test",
    color: "#000",
  },
  geometry: { type: "LineString", coordinates: coords },
})

describe("hopSegmentsFromBundle", () => {
  it("maps Victoria Pimlico–Victoria onto unique-track coordinates", () => {
    const segments = hopSegmentsFromBundle(bundle, "victoria")
    assert.ok(segments.length > 10)
    const hop = hopBetween(segments, "940GZZLUPCO", "940GZZLUVIC")
    assert.ok(hop)
    assert.ok(hop.line.coordinates.length >= 2)
    assert.ok(hop.lengthKm > 0.4)
    assert.ok(hop.lengthKm < 2)
  })

  it("keeps Northern Camden Town branches on different hops", () => {
    const segments = hopSegmentsFromBundle(bundle, "northern")
    const toEuston = hopBetween(segments, "940GZZLUCTN", "940GZZLUEUS")
    const toKentish = hopBetween(segments, "940GZZLUCTN", "940GZZLUKSH")
    assert.ok(toEuston)
    assert.ok(toKentish)
    assert.notDeepEqual(
      toEuston.line.coordinates,
      toKentish.line.coordinates,
    )
  })

  it("walks a junction between two stations and concatenates coordinates", () => {
    const origin: LngLat = [-0.12, 51.5]
    const mid: LngLat = [-0.12, 51.504]
    const east: LngLat = [-0.11, 51.504]
    const stations: TrackStation[] = [
      { id: "A", name: "A", label: "A", coordinates: origin },
      { id: "B", name: "B", label: "B", coordinates: east },
    ]
    const features = [
      feature("west", [origin, mid]),
      feature("east", [mid, east]),
    ]
    const synthetic: TransitGeometryBundle = {
      lines: { type: "FeatureCollection", features },
      stations: {
        type: "FeatureCollection",
        features: stations.map((station) => ({
          type: "Feature",
          id: station.id,
          properties: {
            featureId: station.id,
            name: station.name,
            label: station.label ?? station.name,
            lineIds: ["test"],
          },
          geometry: { type: "Point", coordinates: station.coordinates },
        })),
      },
    }
    const topology = contractTrackTopology(features, stations)
    assert.ok(topology.nodes.some((node) => node.kind === "junction"))
    const segments = hopSegmentsFromBundle(synthetic, "test", {
      graph: hopGraphFromOrderedStops(["A", "B"]),
      stations,
    })
    assert.equal(segments.length, 1)
    assert.ok(segments[0]!.line.coordinates.length >= 3)
    const polylines = hopSegmentsToPolylines(segments)
    const picked = pickHopPolyline(polylines, "A", "B")
    assert.ok(picked)
  })
})
