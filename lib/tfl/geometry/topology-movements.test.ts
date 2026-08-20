import assert from "node:assert/strict"
import { describe, it } from "node:test"
import type { Feature, LineString } from "geojson"
import type { LineSegmentProperties } from "@/lib/tfl/geography-types"
import type { ContractedTopology } from "./contract-track-topology"
import { movementPairs, osmMovementsForTopology } from "./topology-movements"

const topology: ContractedTopology = {
  nodes: [
    { id: "a", kind: "station", coordinates: [-0.01, 0] },
    { id: "j", kind: "junction", coordinates: [0, 0] },
    { id: "b", kind: "station", coordinates: [0.01, 0.008] },
    { id: "c", kind: "station", coordinates: [0.01, -0.008] },
  ],
  edges: [
    { id: "aj", from: "a", to: "j", featureId: "track" },
    { id: "jb", from: "j", to: "b", featureId: "track" },
    { id: "jc", from: "j", to: "c", featureId: "track" },
  ],
}

const variant = (
  id: string,
  coordinates: [number, number][]
): Feature<LineString, LineSegmentProperties> => ({
  type: "Feature",
  id,
  properties: {
    featureId: id,
    lineId: "test",
    lineName: "Test",
    color: "#000",
  },
  geometry: { type: "LineString", coordinates },
})

describe("osmMovementsForTopology", () => {
  it("derives the two smooth Y continuations without inventing branch-to-branch", () => {
    const movements = osmMovementsForTopology(topology, [
      variant("relation/1-0", [
        [-0.01, 0],
        [0, 0],
        [0.01, 0.008],
      ]),
      variant("relation/2-0", [
        [0.01, 0.008],
        [0, 0],
        [-0.01, 0],
      ]),
      variant("relation/3-0", [
        [-0.01, 0],
        [0, 0],
        [0.01, -0.008],
      ]),
      variant("relation/4-0", [
        [0.01, -0.008],
        [0, 0],
        [-0.01, 0],
      ]),
    ])

    assert.ok(
      movements.some((movement) => movement.from === "a" && movement.to === "b")
    )
    assert.ok(
      movements.some((movement) => movement.from === "a" && movement.to === "c")
    )
    assert.equal(
      movements.some(
        (movement) =>
          (movement.from === "b" && movement.to === "c") ||
          (movement.from === "c" && movement.to === "b")
      ),
      false
    )
  })

  it("derives continuity through a two-leg node", () => {
    const corridor: ContractedTopology = {
      nodes: [
        { id: "west", kind: "station", coordinates: [-0.01, 0] },
        { id: "middle", kind: "station", coordinates: [0, 0.004] },
        { id: "east", kind: "station", coordinates: [0.01, 0] },
      ],
      edges: [
        { id: "west-middle", from: "west", to: "middle", featureId: "track" },
        { id: "middle-east", from: "middle", to: "east", featureId: "track" },
      ],
    }

    const movements = osmMovementsForTopology(corridor, [
      variant("relation/corridor-0", [
        [-0.01, 0],
        [0, 0.004],
        [0.01, 0],
      ]),
    ])

    assert.ok(
      movements.some(
        (movement) =>
          movement.from === "west" &&
          movement.via === "middle" &&
          movement.to === "east"
      )
    )
  })
})

describe("movementPairs", () => {
  it("merges directions that share the same from-via-to after station aliases collapse", () => {
    const pairs = movementPairs([
      {
        id: "s:910GSTHALL|s:910GEALINGB|s:940GZZLUPAC",
        from: "s:910GSTHALL",
        via: "s:910GEALINGB",
        to: "s:940GZZLUPAC",
        patternIds: ["elizabeth/fast"],
        source: "tfl-station-pattern",
        confidence: "declared",
      },
      {
        id: "s:910GSTHALL|s:910GEALINGB|s:940GZZLUPAC",
        from: "s:910GSTHALL",
        via: "s:910GEALINGB",
        to: "s:940GZZLUPAC",
        patternIds: ["elizabeth/allstop"],
        source: "tfl-station-pattern",
        confidence: "declared",
      },
    ])

    assert.equal(pairs.length, 1)
    assert.equal(pairs[0]?.directions.length, 1)
    assert.deepEqual(pairs[0]?.directions[0]?.patternIds, [
      "elizabeth/fast",
      "elizabeth/allstop",
    ])
  })
})
