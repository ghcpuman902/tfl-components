import assert from "node:assert/strict"
import { describe, it } from "node:test"
import dlr from "@/data/geography/unique-track/dlr/full.json"
import elizabeth from "@/data/geography/unique-track/elizabeth/full.json"
import tube from "@/data/geography/unique-track/tube/full.json"
import type { ContractedTopology } from "./contract-track-topology"
import {
  regularRoutePatterns,
  tflSequencesPassengerTopology,
} from "./tfl-sequences-topology"
import type { LngLat, TrackStation } from "./transit-track-graph"

const stationsFromBundle = (bundle: {
  stations: { features?: { id?: string | number; geometry?: { type?: string; coordinates?: number[] }; properties: { featureId?: string; name?: string; label?: string } }[] }
}): TrackStation[] =>
  (bundle.stations.features ?? []).flatMap((feature) => {
    if (feature.geometry?.type !== "Point") return []
    const coords = feature.geometry.coordinates
    if (!coords || coords.length < 2) return []
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

const halvesNamed = (topology: ContractedTopology, name: string) =>
  topology.nodes.filter((node) => node.stationName === name)

const hopSet = (topology: ContractedTopology) =>
  new Set(
    topology.edges
      .filter((edge) => edge.kind !== "bond")
      .map((edge) =>
        [nameOf(topology, edge.from), nameOf(topology, edge.to)].sort().join("|")
      )
  )

describe("tflSequencesPassengerTopology", () => {
  it("pairs reverse Regular routes and keeps unpaired directed evidence", () => {
    const patterns = regularRoutePatterns("elizabeth")
    assert.ok(patterns.length >= 2)
    const paired = patterns.filter((pattern) => pattern.paired)
    const unpaired = patterns.filter((pattern) => !pattern.paired)
    assert.ok(paired.length >= 2)
    assert.ok(paired.length % 2 === 0)
    for (const pattern of paired) {
      const mate = patterns.find((item) => item.id === pattern.pairPatternId)
      assert.ok(mate)
      assert.deepEqual([...pattern.stationIds].reverse(), mate.stationIds)
      assert.notEqual(pattern.direction, mate.direction)
    }
    assert.ok(unpaired.every((pattern) => !pattern.pairPatternId))
  })

  it("builds hops and movements from the same Regular route list", () => {
    const compiled = tflSequencesPassengerTopology(
      "elizabeth",
      stationsFromBundle(elizabeth)
    )
    assert.ok(compiled)
    const expectedHops = new Set<string>()
    for (const pattern of compiled.patterns) {
      for (let index = 0; index < pattern.stationIds.length - 1; index += 1) {
        expectedHops.add(
          [pattern.stationIds[index]!, pattern.stationIds[index + 1]!]
            .sort()
            .join("|")
        )
      }
    }
    const actualHops = new Set(
      compiled.topology.edges
        .filter((edge) => edge.kind !== "bond")
        .map((edge) => {
          const from = compiled.topology.nodes.find((node) => node.id === edge.from)
          const to = compiled.topology.nodes.find((node) => node.id === edge.to)
          return [from?.stationId ?? "", to?.stationId ?? ""].sort().join("|")
        })
    )
    for (const hop of expectedHops) {
      assert.ok(actualHops.has(hop), `missing hop ${hop}`)
    }

    const forbidden = compiled.movements.some((movement) => {
      const via = nameOf(compiled.topology, movement.via)
      const ends = [
        nameOf(compiled.topology, movement.from),
        nameOf(compiled.topology, movement.to),
      ].sort()
      return (
        via === "Whitechapel" &&
        ends[0] === "Canary Wharf" &&
        ends[1] === "Stratford"
      )
    })
    assert.equal(forbidden, false)
  })

  it("splits Northern Euston and Kennington and keeps one Camden Town", () => {
    const compiled = tflSequencesPassengerTopology(
      "northern",
      stationsFromBundle(tube)
    )
    assert.ok(compiled)
    const { topology, movements } = compiled
    const euston = halvesNamed(topology, "Euston")
    assert.equal(euston.length, 2)
    assert.ok(euston.every((node) => node.splitFrom))
    assert.ok(
      topology.edges.some(
        (edge) =>
          edge.kind === "bond" &&
          euston.some((node) => node.id === edge.from) &&
          euston.some((node) => node.id === edge.to)
      )
    )
    assert.deepEqual(
      euston.map((node) => neighbors(topology, node.id)).sort(),
      [
        ["Camden Town", "King's Cross St. Pancras"],
        ["Mornington Crescent", "Warren Street"],
      ]
    )

    const camden = halvesNamed(topology, "Camden Town")
    assert.equal(camden.length, 1)
    assert.equal(neighbors(topology, camden[0]!.id).length, 4)

    const kennington = halvesNamed(topology, "Kennington")
    assert.equal(kennington.length, 2)
    const viaKennington = movements.filter((movement) =>
      kennington.some((node) => node.id === movement.via)
    )
    const pairs = [
      ...new Set(
        viaKennington.map((movement) =>
          [nameOf(topology, movement.from), nameOf(topology, movement.to)]
            .sort()
            .join(" ↔ ")
        )
      ),
    ].sort()
    assert.deepEqual(pairs, [
      "Elephant & Castle ↔ Oval",
      "Nine Elms ↔ Waterloo",
      "Oval ↔ Waterloo",
    ])
  })

  it("keeps DLR Poplar as a bonded pair and does not invent a longest-route trunk", () => {
    const compiled = tflSequencesPassengerTopology(
      "dlr",
      stationsFromBundle(dlr)
    )
    assert.ok(compiled)
    const names = new Set(
      compiled.topology.nodes.map((node) => node.stationName)
    )
    for (const name of [
      "Lewisham",
      "Poplar",
      "Blackwall",
      "Canning Town",
      "Woolwich Arsenal",
    ]) {
      assert.ok(names.has(name), `missing ${name}`)
    }
    const poplar = halvesNamed(compiled.topology, "Poplar")
    assert.equal(poplar.length, 2)
    assert.ok(poplar.every((node) => node.splitFrom))
    const neighborSets = poplar.map((node) => neighbors(compiled.topology, node.id))
    assert.ok(neighborSets.some((set) => set.includes("Blackwall") && set.includes("Westferry")))
    assert.ok(
      neighborSets.some(
        (set) => set.includes("All Saints") && set.includes("West India Quay")
      )
    )
    const hops = hopSet(compiled.topology)
    assert.ok(hops.has("Blackwall|East India"))
    assert.ok(hops.has("Canning Town|East India"))
    const lewisham = compiled.topology.nodes.find(
      (node) => node.stationName === "Lewisham"
    )
    const woolwich = compiled.topology.nodes.find(
      (node) => node.stationName === "Woolwich Arsenal"
    )
    assert.ok(lewisham && woolwich)
    assert.equal(
      compiled.topology.edges.some(
        (edge) =>
          (edge.from === lewisham.id && edge.to === woolwich.id) ||
          (edge.from === woolwich.id && edge.to === lewisham.id)
      ),
      false,
      "Lewisham is not joined to Woolwich as one trunk hop"
    )
  })

  it("keeps Circle as a loop with one Edgware Road and a Hammersmith spur", () => {
    const compiled = tflSequencesPassengerTopology(
      "circle",
      stationsFromBundle(tube)
    )
    assert.ok(compiled)
    const edgware = halvesNamed(compiled.topology, "Edgware Road")
    assert.equal(edgware.length, 1)
    const hammersmith = halvesNamed(compiled.topology, "Hammersmith")
    assert.equal(hammersmith.length, 1)
    const trackEdges = compiled.topology.edges.filter(
      (edge) => edge.kind !== "bond"
    )
    assert.ok(
      trackEdges.length >= compiled.topology.nodes.length,
      "a loop plus spur has at least as many hops as stations"
    )
  })
})
