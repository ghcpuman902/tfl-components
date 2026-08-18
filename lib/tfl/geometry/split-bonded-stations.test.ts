import assert from "node:assert/strict"
import { describe, it } from "node:test"
import tube from "@/data/geography/unique-track/tube/full.json"
import { officialTrackTopology } from "./official-track-topology"
import { servicePatternEvidenceForLine } from "@/lib/tfl/service-pattern-evidence"
import { tflMovementsForTopology } from "./topology-movements"
import { splitBondedThroughStations } from "./split-bonded-stations"
import type { LngLat, TrackStation } from "./transit-track-graph"
import type { ContractedTopology } from "./contract-track-topology"
import type { DirectedTopologyMovement } from "./topology-movements"

const stationsFromTube = (): TrackStation[] =>
  (tube.stations.features ?? []).flatMap((feature) => {
    if (feature.geometry?.type !== "Point") return []
    const coords = feature.geometry.coordinates
    if (coords.length < 2) return []
    return [
      {
        id: String(feature.id ?? feature.properties.featureId),
        name: feature.properties.name,
        label: feature.properties.label,
        coordinates: [coords[0]!, coords[1]!] as LngLat,
      },
    ]
  })

const nameOf = (topology: ContractedTopology, id: string) =>
  topology.nodes.find((node) => node.id === id)?.stationName ?? id

const neighbors = (topology: ContractedTopology, nodeId: string) =>
  topology.edges
    .filter(
      (edge) =>
        edge.kind !== "bond" &&
        (edge.from === nodeId || edge.to === nodeId)
    )
    .map((edge) =>
      nameOf(topology, edge.from === nodeId ? edge.to : edge.from)
    )
    .sort()

const splitNorthern = () => {
  const raw = officialTrackTopology("northern", stationsFromTube())
  assert.ok(raw)
  const directed = tflMovementsForTopology(
    raw,
    servicePatternEvidenceForLine("northern")
  )
  return splitBondedThroughStations(raw, directed)
}

const halvesNamed = (topology: ContractedTopology, name: string) =>
  topology.nodes.filter((node) => node.stationName === name)

describe("splitBondedThroughStations", () => {
  it("splits a clean 2+2 through-pair (Euston) and leaves a full crossing (Camden Town)", () => {
    const { topology } = splitNorthern()
    const euston = halvesNamed(topology, "Euston")
    assert.equal(euston.length, 2)
    assert.ok(euston.every((node) => node.splitFrom && node.kind === "station"))
    const bond = topology.edges.find(
      (edge) =>
        edge.kind === "bond" &&
        euston.some((node) => node.id === edge.from) &&
        euston.some((node) => node.id === edge.to)
    )
    assert.ok(bond)
    const neighborSets = euston.map((node) => neighbors(topology, node.id))
    assert.deepEqual(neighborSets.sort(), [
      ["Camden Town", "King's Cross St. Pancras"],
      ["Mornington Crescent", "Warren Street"],
    ])

    const camden = halvesNamed(topology, "Camden Town")
    assert.equal(camden.length, 1)
    assert.equal(neighbors(topology, camden[0]!.id).length, 4)
  })

  it("splits Kennington and forks Oval onto both halves so Oval ↔ Waterloo still through-runs", () => {
    const { topology, movements } = splitNorthern()
    const kennington = halvesNamed(topology, "Kennington")
    assert.equal(kennington.length, 2)
    const neighborSets = kennington.map((node) => neighbors(topology, node.id))
    const bank = neighborSets.find((set) => set.includes("Elephant & Castle"))
    const charing = neighborSets.find((set) => set.includes("Nine Elms"))
    assert.deepEqual(bank, ["Elephant & Castle", "Oval"])
    assert.ok(charing?.includes("Nine Elms"))
    assert.ok(charing?.includes("Waterloo"))
    assert.ok(charing?.includes("Oval"))

    const viaKennington = movements.filter((movement) =>
      kennington.some((node) => node.id === movement.via)
    )
    const pairLabel = (movement: DirectedTopologyMovement) =>
      [nameOf(topology, movement.from), nameOf(topology, movement.to)]
        .sort()
        .join(" ↔ ")
    const pairs = [...new Set(viaKennington.map(pairLabel))].sort()
    assert.deepEqual(pairs, [
      "Elephant & Castle ↔ Oval",
      "Nine Elms ↔ Waterloo",
      "Oval ↔ Waterloo",
    ])
  })

  it("does not invent a split when through-moves are a star, not two corridors", () => {
    const topology: ContractedTopology = {
      nodes: [
        { id: "hub", kind: "station", coordinates: [0, 0], stationName: "Hub" },
        { id: "a", kind: "station", coordinates: [-1, 0], stationName: "A" },
        { id: "b", kind: "station", coordinates: [1, 0], stationName: "B" },
        { id: "c", kind: "station", coordinates: [0, 1], stationName: "C" },
        { id: "d", kind: "station", coordinates: [0, -1], stationName: "D" },
      ],
      edges: [
        { id: "ha", from: "hub", to: "a", featureId: "line" },
        { id: "hb", from: "hub", to: "b", featureId: "line" },
        { id: "hc", from: "hub", to: "c", featureId: "line" },
        { id: "hd", from: "hub", to: "d", featureId: "line" },
      ],
    }
    const movements: DirectedTopologyMovement[] = [
      {
        id: "1",
        from: "a",
        via: "hub",
        to: "b",
        patternIds: ["p"],
        source: "tfl-station-pattern",
        confidence: "declared",
      },
      {
        id: "2",
        from: "a",
        via: "hub",
        to: "c",
        patternIds: ["p"],
        source: "tfl-station-pattern",
        confidence: "declared",
      },
      {
        id: "3",
        from: "a",
        via: "hub",
        to: "d",
        patternIds: ["p"],
        source: "tfl-station-pattern",
        confidence: "declared",
      },
    ]
    const result = splitBondedThroughStations(topology, movements)
    assert.equal(
      result.topology.nodes.filter((node) => node.id.startsWith("hub")).length,
      1
    )
    assert.equal(
      result.topology.edges.filter((edge) => edge.kind === "bond").length,
      0
    )
  })
})
