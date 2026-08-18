/**
 * Map each passenger hop onto the unique-track OSM run between those stops.
 *
 * Contracted topology keeps the real coordinates between stations (and the
 * junctions between them). Live vehicles then walk that hop only, instead of
 * picking a whole-line polyline and overshooting onto another branch.
 */
import type { Feature, LineString } from "geojson"
import type {
  LineSegmentProperties,
  TransitGeometryBundle,
} from "@/lib/tfl/geography-types"
import {
  contractTrackTopology,
  type ContractedEdge,
  type ContractedNode,
  type ContractedTopology,
} from "@/lib/tfl/geometry/contract-track-topology"
import { minutesForHop } from "@/lib/tfl/geometry/line-hop-times"
import type { LngLat, TrackStation } from "@/lib/tfl/geometry/transit-track-graph"
import {
  hopGraphForRailLine,
  type HopGraph,
} from "@/lib/tfl/vehicle-hop-graph"
import type { RoutePolyline } from "@/lib/tfl/vehicle-progress"

export type HopSegment = {
  lineId: string
  fromStationId: string
  toStationId: string
  line: LineString
  lengthKm: number
  hopMinutes?: number
}

const METERS_PER_DEG_LAT = 111_320
const REF_LAT = 51.5
const METERS_PER_DEG_LNG =
  METERS_PER_DEG_LAT * Math.cos((REF_LAT * Math.PI) / 180)

const distMetres = (a: LngLat, b: LngLat): number => {
  const dx = (a[0] - b[0]) * METERS_PER_DEG_LNG
  const dy = (a[1] - b[1]) * METERS_PER_DEG_LAT
  return Math.hypot(dx, dy)
}

const lineLengthKm = (coordinates: readonly LngLat[]): number => {
  let metres = 0
  for (let index = 0; index < coordinates.length - 1; index += 1) {
    metres += distMetres(coordinates[index]!, coordinates[index + 1]!)
  }
  return metres / 1000
}

export const stationsFromBundleForLine = (
  bundle: TransitGeometryBundle,
  lineId: string,
): TrackStation[] =>
  (bundle.stations.features ?? []).flatMap((feature) => {
    if (feature.geometry?.type !== "Point") return []
    if (!(feature.properties.lineIds ?? []).includes(lineId)) return []
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

export const featuresForLine = (
  bundle: TransitGeometryBundle,
  lineId: string,
): Feature<LineString, LineSegmentProperties>[] =>
  (bundle.lines.features ?? []).filter(
    (feature): feature is Feature<LineString, LineSegmentProperties> =>
      feature.geometry?.type === "LineString" &&
      feature.properties?.lineId === lineId,
  )

const adjacency = (
  topology: ContractedTopology,
): Map<string, { to: string; edge: ContractedEdge }[]> => {
  const map = new Map<string, { to: string; edge: ContractedEdge }[]>()
  const add = (from: string, to: string, edge: ContractedEdge) => {
    const list = map.get(from) ?? []
    list.push({ to, edge })
    map.set(from, list)
  }
  for (const edge of topology.edges) {
    if (edge.kind === "bond") continue
    add(edge.from, edge.to, edge)
    add(edge.to, edge.from, edge)
  }
  return map
}

const edgeLengthM = (
  edge: ContractedEdge,
  nodeById: ReadonlyMap<string, ContractedNode>,
): number => {
  const coordinates = edge.coordinates
  if (coordinates && coordinates.length >= 2) return lineLengthKm(coordinates) * 1000
  const from = nodeById.get(edge.from)
  const to = nodeById.get(edge.to)
  if (!from || !to) return Number.POSITIVE_INFINITY
  return distMetres(from.coordinates, to.coordinates)
}

const nodesForStation = (
  topology: ContractedTopology,
  stationId: string,
  canonical: (id: string) => string,
): ContractedNode[] => {
  const root = canonical(stationId)
  return topology.nodes.filter(
    (node) => node.stationId != null && canonical(node.stationId) === root,
  )
}

const concatPath = (
  edges: readonly ContractedEdge[],
  startId: string,
  nodeById: ReadonlyMap<string, ContractedNode>,
): LngLat[] => {
  const out: LngLat[] = []
  let at = startId
  for (const edge of edges) {
    const from = nodeById.get(edge.from)
    const to = nodeById.get(edge.to)
    const fallback: LngLat[] =
      from && to ? [from.coordinates, to.coordinates] : []
    const coordinates =
      edge.coordinates && edge.coordinates.length >= 2
        ? edge.coordinates
        : fallback
    if (coordinates.length < 2) continue
    const oriented = edge.from === at ? coordinates : [...coordinates].reverse()
    if (out.length === 0) out.push(...oriented)
    else out.push(...oriented.slice(1))
    at = edge.from === at ? edge.to : edge.from
  }
  return out
}

const shortestHopPath = (
  starts: readonly ContractedNode[],
  ends: ReadonlySet<string>,
  adj: ReadonlyMap<string, { to: string; edge: ContractedEdge }[]>,
  nodeById: ReadonlyMap<string, ContractedNode>,
): { edges: ContractedEdge[]; startId: string } | null => {
  const dist = new Map<string, number>()
  const prev = new Map<string, { nodeId: string; edge: ContractedEdge }>()
  const queue: { nodeId: string; cost: number }[] = []

  for (const node of starts) {
    dist.set(node.id, 0)
    queue.push({ nodeId: node.id, cost: 0 })
  }

  let bestEnd: string | null = null
  let bestCost = Number.POSITIVE_INFINITY

  while (queue.length > 0) {
    queue.sort((left, right) => left.cost - right.cost)
    const current = queue.shift()
    if (!current) break
    if (current.cost !== dist.get(current.nodeId)) continue
    if (ends.has(current.nodeId) && current.cost < bestCost) {
      bestEnd = current.nodeId
      bestCost = current.cost
      continue
    }
    for (const step of adj.get(current.nodeId) ?? []) {
      const nextCost = current.cost + edgeLengthM(step.edge, nodeById)
      if (nextCost >= (dist.get(step.to) ?? Number.POSITIVE_INFINITY)) continue
      dist.set(step.to, nextCost)
      prev.set(step.to, { nodeId: current.nodeId, edge: step.edge })
      queue.push({ nodeId: step.to, cost: nextCost })
    }
  }

  if (!bestEnd) return null
  const edges: ContractedEdge[] = []
  let cursor = bestEnd
  const startIds = new Set(starts.map((node) => node.id))
  while (!startIds.has(cursor)) {
    const step = prev.get(cursor)
    if (!step) return null
    edges.push(step.edge)
    cursor = step.nodeId
  }
  edges.reverse()
  return { edges, startId: cursor }
}

const passengerHops = (
  graph: HopGraph,
): { from: string; to: string }[] => {
  const hops: { from: string; to: string }[] = []
  const seen = new Set<string>()
  for (const [from, tos] of graph.adjacent) {
    for (const to of tos) {
      if (from >= to) continue
      const key = `${from}|${to}`
      if (seen.has(key)) continue
      seen.add(key)
      hops.push({ from, to })
    }
  }
  return hops
}

export const hopSegmentsFromBundle = (
  bundle: TransitGeometryBundle,
  lineId: string,
  options?: {
    hopMinutes?: Record<string, number>
    graph?: HopGraph
    stations?: readonly TrackStation[]
  },
): HopSegment[] => {
  const graph = options?.graph ?? hopGraphForRailLine(lineId)
  const features = featuresForLine(bundle, lineId)
  const stations =
    options?.stations ?? stationsFromBundleForLine(bundle, lineId)
  if (features.length === 0 || stations.length === 0 || !graph.adjacent.size) {
    return []
  }

  const topology = contractTrackTopology(features, stations)
  const nodeById = new Map(topology.nodes.map((node) => [node.id, node]))
  const adj = adjacency(topology)
  const hops = passengerHops(graph)
  const segments: HopSegment[] = []

  for (const hop of hops) {
    const fromNodes = nodesForStation(topology, hop.from, graph.canonical)
    const toNodes = nodesForStation(topology, hop.to, graph.canonical)
    if (fromNodes.length === 0 || toNodes.length === 0) continue
    const path = shortestHopPath(
      fromNodes,
      new Set(toNodes.map((node) => node.id)),
      adj,
      nodeById,
    )
    if (!path) continue
    const coordinates = concatPath(path.edges, path.startId, nodeById)
    if (coordinates.length < 2) continue
    const lengthKm = lineLengthKm(coordinates)
    if (lengthKm <= 0) continue
    const hopMinutes = minutesForHop(
      options?.hopMinutes,
      hop.from,
      hop.to,
      graph.canonical,
    )
    segments.push({
      lineId,
      fromStationId: hop.from,
      toStationId: hop.to,
      line: { type: "LineString", coordinates },
      lengthKm,
      ...(hopMinutes != null ? { hopMinutes } : {}),
    })
  }

  return segments
}

export const hopSegmentsToPolylines = (
  segments: readonly HopSegment[],
): RoutePolyline[] =>
  segments.map((segment) => ({
    lineId: segment.lineId,
    line: segment.line,
    fromStationId: segment.fromStationId,
    toStationId: segment.toStationId,
    hopMinutes: segment.hopMinutes,
  }))
