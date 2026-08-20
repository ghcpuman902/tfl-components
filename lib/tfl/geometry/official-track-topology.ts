/**
 * Passenger topology from tfl-ts `LINE_STATION_SEQUENCES`.
 * Stations and hops are TfL; coordinates come from the geography bundle
 * (TfL-enriched points), not from OSM vertices.
 */
import { formatStationName } from "@/lib/tfl/diagram-station"
import { getStaticLineSequence } from "@/lib/tfl/line-topology"
import { stationCoord } from "@/lib/tfl/station-coords"
import { hopGraphForRailLine } from "@/lib/tfl/vehicle-hop-graph"
import type {
  ContractedEdge,
  ContractedNode,
  ContractedTopology,
} from "@/lib/tfl/geometry/contract-track-topology"
import type {
  LngLat,
  TrackStation,
} from "@/lib/tfl/geometry/transit-track-graph"

const stationNodeId = (stationId: string): string => `s:${stationId}`

const nameFor = (
  stationId: string,
  names: Readonly<Record<string, string>>,
  canonical: (id: string) => string
): string => {
  const root = canonical(stationId)
  const candidates = [names[stationId], names[root]]
  for (const [id, name] of Object.entries(names)) {
    if (canonical(id) === root) candidates.push(name)
  }
  const unique = [...new Set(candidates.filter(Boolean))] as string[]
  unique.sort((a, b) => a.length - b.length)
  return unique[0] ?? formatStationName(stationId)
}

const coordFor = (
  stationId: string,
  byId: Map<string, TrackStation>,
  canonical: (id: string) => string
): LngLat | null => {
  const direct = byId.get(stationId) ?? byId.get(canonical(stationId))
  if (direct) return direct.coordinates
  for (const [id, station] of byId) {
    if (canonical(id) === canonical(stationId)) return station.coordinates
  }
  const fallback = stationCoord(stationId) ?? stationCoord(canonical(stationId))
  return fallback ? [fallback.lon, fallback.lat] : null
}

export const officialTrackTopology = (
  lineId: string,
  stations: readonly TrackStation[]
): ContractedTopology | null => {
  const sequence = getStaticLineSequence(lineId)
  const graph = hopGraphForRailLine(lineId)
  if (!sequence || !graph.adjacent.size) return null

  const names: Record<string, string> = {}
  for (const stop of sequence.stations) {
    names[stop.id] = formatStationName(stop.name)
  }

  const byId = new Map(stations.map((station) => [station.id, station]))
  const nodes: ContractedNode[] = []
  const seen = new Set<string>()

  for (const stationId of graph.adjacent.keys()) {
    const coordinates = coordFor(stationId, byId, graph.canonical)
    if (!coordinates) continue
    const id = stationNodeId(stationId)
    if (seen.has(id)) continue
    seen.add(id)
    const degree = graph.adjacent.get(stationId)?.size ?? 0
    nodes.push({
      id,
      coordinates,
      stationId,
      stationName: nameFor(stationId, names, graph.canonical),
      kind: degree <= 1 ? "terminus" : "station",
    })
  }

  const nodeIds = new Set(nodes.map((node) => node.id))
  const edges: ContractedEdge[] = []
  const edgeSeen = new Set<string>()
  let edgeIndex = 0
  for (const [from, tos] of graph.adjacent) {
    for (const to of tos) {
      if (from >= to) continue
      const fromId = stationNodeId(from)
      const toId = stationNodeId(to)
      if (!nodeIds.has(fromId) || !nodeIds.has(toId)) continue
      const key = `${fromId}|${toId}`
      if (edgeSeen.has(key)) continue
      edgeSeen.add(key)
      edges.push({
        id: `${lineId}-tfl-e${edgeIndex}`,
        from: fromId,
        to: toId,
        featureId: `${lineId}-tfl`,
      })
      edgeIndex += 1
    }
  }

  if (nodes.length === 0) return null
  return { nodes, edges }
}
