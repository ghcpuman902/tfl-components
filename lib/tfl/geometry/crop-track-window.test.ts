import assert from "node:assert/strict"
import { describe, it } from "node:test"
import type { Feature, LineString } from "geojson"
import type { LineSegmentProperties } from "@/lib/tfl/geography-types"
import type { ContractedTopology } from "./contract-track-topology"
import {
  boundsAround,
  cropBundleToBounds,
  neighborhoodTopology,
  nodesMatchingStation,
  pointInBounds,
} from "./crop-track-window"

const line = (
  id: string,
  coordinates: [number, number][],
  lineId = "elizabeth"
): Feature<LineString, LineSegmentProperties> => ({
  type: "Feature",
  id,
  properties: {
    featureId: id,
    lineId,
    lineName: "Elizabeth",
    color: "#60399E",
  },
  geometry: { type: "LineString", coordinates },
})

describe("crop-track-window", () => {
  it("builds a metre window around real coordinates", () => {
    const bounds = boundsAround([[-0.1427, 51.5394]], 800)
    assert.ok(bounds)
    assert.ok(pointInBounds([-0.1427, 51.5394], bounds!))
    assert.equal(pointInBounds([-0.2, 51.4], bounds!), false)
  })

  it("clips a long OSM line to the junction window", () => {
    const bounds = boundsAround([[0, 51.5]], 200)
    assert.ok(bounds)
    const cropped = cropBundleToBounds(
      {
        lines: {
          type: "FeatureCollection",
          features: [
            line("relation/1-0", [
              [-0.02, 51.5],
              [0, 51.5],
              [0.02, 51.5],
            ]),
          ],
        },
        stations: {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              id: "s1",
              properties: {
                featureId: "s1",
                name: "Whitechapel",
                label: "Whitechapel",
                lineIds: ["elizabeth"],
              },
              geometry: { type: "Point", coordinates: [0, 51.5] },
            },
            {
              type: "Feature",
              id: "s2",
              properties: {
                featureId: "s2",
                name: "Far away",
                label: "Far away",
                lineIds: ["elizabeth"],
              },
              geometry: { type: "Point", coordinates: [0.2, 51.5] },
            },
          ],
        },
      },
      bounds!,
      ["elizabeth"]
    )
    assert.equal(cropped.lines.features.length, 1)
    const coords = cropped.lines.features[0]!.geometry.coordinates
    assert.ok(coords.length >= 2)
    assert.ok(
      coords.some((point) => pointInBounds([point[0]!, point[1]!], bounds!))
    )
    assert.ok(Math.max(...coords.map((point) => Math.abs(point[0]!))) < 0.03)
    assert.equal(cropped.stations.features.length, 1)
    assert.equal(cropped.stations.features[0]!.properties.label, "Whitechapel")
  })

  it("keeps a hop neighbourhood around the named station", () => {
    const topology: ContractedTopology = {
      nodes: [
        {
          id: "west",
          kind: "station",
          stationName: "Paddington",
          coordinates: [-0.01, 51.5],
        },
        {
          id: "hub",
          kind: "station",
          stationName: "Whitechapel",
          coordinates: [0, 51.5],
        },
        {
          id: "east",
          kind: "station",
          stationName: "Stratford",
          coordinates: [0.01, 51.5],
        },
        {
          id: "south",
          kind: "station",
          stationName: "Canary Wharf",
          coordinates: [0, 51.49],
        },
        {
          id: "far",
          kind: "station",
          stationName: "Shenfield",
          coordinates: [0.03, 51.5],
        },
      ],
      edges: [
        { id: "e1", from: "west", to: "hub", featureId: "a" },
        { id: "e2", from: "hub", to: "east", featureId: "a" },
        { id: "e3", from: "hub", to: "south", featureId: "b" },
        { id: "e4", from: "east", to: "far", featureId: "a" },
      ],
    }
    const seeds = nodesMatchingStation(topology, "Whitechapel")
    assert.equal(seeds.length, 1)
    const local = neighborhoodTopology(topology, [seeds[0]!.id], 1)
    assert.deepEqual(local.nodes.map((node) => node.id).sort(), [
      "east",
      "hub",
      "south",
      "west",
    ])
    assert.equal(
      local.nodes.some((node) => node.id === "far"),
      false
    )
  })
})
