import assert from "node:assert/strict"
import { describe, it } from "node:test"
import dlr from "@/data/geography/unique-track/dlr/full.json"
import tube from "@/data/geography/unique-track/tube/full.json"
import type { ContractedTopology } from "./contract-track-topology"
import { STRESS_BOND_GAP, STRESS_MIN_SEP } from "./stress-layout"
import {
  countTrackCrossings,
  layoutTflSequences,
} from "./tfl-sequences-layout"
import { tflSequencesPassengerTopology } from "./tfl-sequences-topology"
import type { LngLat, TrackStation } from "./transit-track-graph"

const stationsFromBundle = (bundle: {
  stations: {
    features?: {
      id?: string | number
      geometry?: { type?: string; coordinates?: number[] }
      properties: { featureId?: string; name?: string; label?: string }
    }[]
  }
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

const graph = (
  nodes: { id: string; lng: number; lat: number; stationId?: string }[],
  edges: { from: string; to: string; kind?: "bond" | "track" }[]
): ContractedTopology => ({
  nodes: nodes.map((node) => ({
    id: node.id,
    coordinates: [node.lng, node.lat] as LngLat,
    stationId: node.stationId ?? node.id,
    stationName: node.id,
    kind: "station",
  })),
  edges: edges.map((edge, index) => ({
    id: `e${index}`,
    from: edge.from,
    to: edge.to,
    featureId: "line",
    kind: edge.kind,
  })),
})

const turnDegrees = (
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number
): number => {
  const abx = bx - ax
  const aby = by - ay
  const bcx = cx - bx
  const bcy = cy - by
  const dot = abx * bcx + aby * bcy
  const denom = Math.hypot(abx, aby) * Math.hypot(bcx, bcy) || 1
  const cos = Math.min(1, Math.max(-1, dot / denom))
  return (Math.acos(cos) * 180) / Math.PI
}

const byId = (nodes: { id: string; x: number; y: number }[]) =>
  new Map(nodes.map((node) => [node.id, node]))

describe("layoutTflSequences", () => {
  it("is deterministic and recenters to finite coordinates", () => {
    const topology = graph(
      [
        { id: "w", lng: -0.2, lat: 51.5 },
        { id: "m", lng: -0.1, lat: 51.51 },
        { id: "e", lng: 0.05, lat: 51.49 },
      ],
      [
        { from: "w", to: "m" },
        { from: "m", to: "e" },
      ]
    )
    const first = layoutTflSequences(topology, [])
    const second = layoutTflSequences(topology, [])
    assert.deepEqual(
      first.nodes.map((node) => [node.x, node.y]),
      second.nodes.map((node) => [node.x, node.y])
    )
    assert.ok(first.nodes.every((node) => Number.isFinite(node.x) && Number.isFinite(node.y)))
    const mx = first.nodes.reduce((sum, node) => sum + node.x, 0) / first.nodes.length
    const my = first.nodes.reduce((sum, node) => sum + node.y, 0) / first.nodes.length
    assert.ok(Math.abs(mx) < 1e-6)
    assert.ok(Math.abs(my) < 1e-6)
  })

  it("keeps west west and south south from the geographic seed", () => {
    const topology = graph(
      [
        { id: "w", lng: -0.2, lat: 51.51 },
        { id: "j", lng: -0.1, lat: 51.51 },
        { id: "e", lng: 0.05, lat: 51.51 },
        { id: "s", lng: -0.1, lat: 51.48 },
      ],
      [
        { from: "w", to: "j" },
        { from: "j", to: "e" },
        { from: "j", to: "s" },
      ]
    )
    const laid = layoutTflSequences(topology, [
      { from: "w", via: "j", to: "e", patternIds: ["p"] },
    ])
    const nodes = byId(laid.nodes)
    assert.ok(nodes.get("e")!.x > nodes.get("w")!.x, "east stays east of west")
    assert.ok(nodes.get("s")!.y > nodes.get("j")!.y, "south stays south")
  })

  it("makes a longer hop occupy more layout length", () => {
    const topology = graph(
      [
        { id: "a", lng: -0.12, lat: 51.5, stationId: "A" },
        { id: "b", lng: -0.1, lat: 51.5, stationId: "B" },
        { id: "c", lng: -0.08, lat: 51.5, stationId: "C" },
      ],
      [
        { from: "a", to: "b" },
        { from: "b", to: "c" },
      ]
    )
    const laid = layoutTflSequences(
      topology,
      [],
      { lineId: "test", hops: { "A|B": 1, "B|C": 3 }, timedHopCount: 2 }
    )
    const nodes = byId(laid.nodes)
    const short = Math.hypot(
      nodes.get("b")!.x - nodes.get("a")!.x,
      nodes.get("b")!.y - nodes.get("a")!.y
    )
    const long = Math.hypot(
      nodes.get("c")!.x - nodes.get("b")!.x,
      nodes.get("c")!.y - nodes.get("b")!.y
    )
    assert.ok(long > short * 1.6, `long ${long.toFixed(1)} vs short ${short.toFixed(1)}`)
  })

  it("straightens a permitted continuation and leaves an unsupported turn sharp", () => {
    const topology = graph(
      [
        { id: "trunk", lng: -0.14, lat: 51.5 },
        { id: "j", lng: -0.1, lat: 51.5 },
        { id: "upper", lng: -0.07, lat: 51.52 },
        { id: "lower", lng: -0.07, lat: 51.48 },
      ],
      [
        { from: "trunk", to: "j" },
        { from: "j", to: "upper" },
        { from: "j", to: "lower" },
      ]
    )
    const laid = layoutTflSequences(topology, [
      { from: "trunk", via: "j", to: "upper", patternIds: ["p"] },
    ])
    const nodes = byId(laid.nodes)
    const permitted = turnDegrees(
      nodes.get("trunk")!.x,
      nodes.get("trunk")!.y,
      nodes.get("j")!.x,
      nodes.get("j")!.y,
      nodes.get("upper")!.x,
      nodes.get("upper")!.y
    )
    const unsupported = turnDegrees(
      nodes.get("upper")!.x,
      nodes.get("upper")!.y,
      nodes.get("j")!.x,
      nodes.get("j")!.y,
      nodes.get("lower")!.x,
      nodes.get("lower")!.y
    )
    assert.ok(permitted < 40, `permitted ${permitted.toFixed(1)}°`)
    assert.ok(unsupported > 70, `unsupported ${unsupported.toFixed(1)}°`)
  })

  it("keeps a bonded pair close and other nodes apart", () => {
    const topology = graph(
      [
        { id: "west", lng: -0.16, lat: 51.5 },
        { id: "a", lng: -0.1001, lat: 51.5002 },
        { id: "b", lng: -0.0999, lat: 51.4998 },
        { id: "east", lng: -0.04, lat: 51.5 },
      ],
      [
        { from: "west", to: "a" },
        { from: "a", to: "east" },
        { from: "west", to: "b" },
        { from: "b", to: "east" },
        { from: "a", to: "b", kind: "bond" },
      ]
    )
    const laid = layoutTflSequences(topology, [])
    const nodes = byId(laid.nodes)
    const gap = Math.hypot(
      nodes.get("a")!.x - nodes.get("b")!.x,
      nodes.get("a")!.y - nodes.get("b")!.y
    )
    assert.ok(
      Math.abs(gap - STRESS_BOND_GAP) < 3,
      `bond gap ${gap.toFixed(1)}`
    )
    const far = Math.hypot(
      nodes.get("west")!.x - nodes.get("a")!.x,
      nodes.get("west")!.y - nodes.get("a")!.y
    )
    assert.ok(far > STRESS_MIN_SEP * 0.9)
  })

  it("does not add crossings beyond the geographic seed", () => {
    const topology = graph(
      [
        { id: "nw", lng: -0.14, lat: 51.52 },
        { id: "ne", lng: -0.06, lat: 51.52 },
        { id: "sw", lng: -0.14, lat: 51.48 },
        { id: "se", lng: -0.06, lat: 51.48 },
      ],
      [
        { from: "nw", to: "sw" },
        { from: "ne", to: "se" },
      ]
    )
    const laid = layoutTflSequences(topology, [])
    assert.equal(laid.seedCrossings, 0)
    assert.ok(laid.crossings <= laid.seedCrossings)
    const index = new Map(laid.nodes.map((node, i) => [node.id, i]))
    const crossings = countTrackCrossings(
      {
        x: laid.nodes.map((node) => node.x),
        y: laid.nodes.map((node) => node.y),
      },
      [
        { from: index.get("nw")!, to: index.get("sw")! },
        { from: index.get("ne")!, to: index.get("se")! },
      ]
    )
    assert.equal(crossings, 0)
  })

  it("does not straighten DLR Lewisham–Woolwich into one trunk", () => {
    const compiled = tflSequencesPassengerTopology(
      "dlr",
      stationsFromBundle(dlr)
    )
    assert.ok(compiled)
    const laid = layoutTflSequences(compiled.topology, compiled.movements)
    const nodes = byId(laid.nodes)
    const lewisham = compiled.topology.nodes.find(
      (node) => node.stationName === "Lewisham"
    )
    const poplar = compiled.topology.nodes.find(
      (node) => node.stationName === "Poplar"
    )
    const woolwich = compiled.topology.nodes.find(
      (node) => node.stationName === "Woolwich Arsenal"
    )
    assert.ok(lewisham && poplar && woolwich)
    const a = nodes.get(lewisham.id)!
    const b = nodes.get(poplar.id)!
    const c = nodes.get(woolwich.id)!
    const turn = turnDegrees(a.x, a.y, b.x, b.y, c.x, c.y)
    assert.ok(
      turn > 25,
      `Lewisham–Poplar–Woolwich should bend, got ${turn.toFixed(1)}°`
    )
  })

  it("keeps Northern Bank east of Charing Cross from the geographic seed", () => {
    const compiled = tflSequencesPassengerTopology(
      "northern",
      stationsFromBundle(tube)
    )
    assert.ok(compiled)
    const laid = layoutTflSequences(compiled.topology, compiled.movements)
    const bank = compiled.topology.nodes.find(
      (node) => node.stationName === "Bank"
    )
    const cx = compiled.topology.nodes.find(
      (node) => node.stationName === "Charing Cross"
    )
    assert.ok(bank && cx)
    const nodes = byId(laid.nodes)
    assert.ok(
      nodes.get(bank.id)!.x > nodes.get(cx.id)!.x,
      "Bank should sit east of Charing Cross"
    )
    assert.ok(laid.crossings <= laid.seedCrossings)
  })
})
