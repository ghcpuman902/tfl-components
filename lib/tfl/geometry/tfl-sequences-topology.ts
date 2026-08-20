/**
 * Passenger topology from Regular TfL ordered routes (both directions).
 * Reverse-equivalent patterns merge; unpaired directed patterns stay.
 * Hops and permitted triples come from the same route list.
 */
import { formatStationName } from "@/lib/tfl/diagram-station"
import { getStaticLineSequence } from "@/lib/tfl/line-topology"
import { stationCoord } from "@/lib/tfl/station-coords"
import { stationHubAliasGroups } from "@/lib/tfl/vehicle-hop-graph"
import { splitBondedThroughStations } from "@/lib/tfl/geometry/split-bonded-stations"
import type {
  ContractedEdge,
  ContractedNode,
  ContractedTopology,
} from "@/lib/tfl/geometry/contract-track-topology"
import type { DirectedTopologyMovement } from "@/lib/tfl/geometry/topology-movements"
import type {
  LngLat,
  TrackStation,
} from "@/lib/tfl/geometry/transit-track-graph"

export type TflSequencesPattern = {
  id: string
  name: string
  direction: string
  stationIds: string[]
  paired: boolean
  pairPatternId?: string
}

export type TflSequencesCompile = {
  lineId: string
  lineName: string
  topology: ContractedTopology
  movements: DirectedTopologyMovement[]
  patterns: TflSequencesPattern[]
  unpairedPatternIds: string[]
}

const stationNodeId = (stationId: string): string => `s:${stationId}`

const hopKey = (a: string, b: string): string =>
  a < b ? `${a}|${b}` : `${b}|${a}`

const reverseJoined = (ids: readonly string[]): string =>
  [...ids].reverse().join("\0")

const aliasCanonical = (): ((id: string) => string) => {
  const aliases = new Map<string, string>()
  for (const group of stationHubAliasGroups()) {
    const ids = [...new Set(group.map((id) => id.trim()).filter(Boolean))]
    const root = ids[0]
    if (!root) continue
    for (const id of ids) aliases.set(id, root)
  }
  return (id: string) => aliases.get(id) ?? id
}

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

const displayRouteName = (name: string): string =>
  name
    .replace(/\s*&harr;\s*/g, " ↔ ")
    .replace(/\s+/g, " ")
    .trim()

export const regularRoutePatterns = (lineId: string): TflSequencesPattern[] => {
  const sequence = getStaticLineSequence(lineId)
  if (!sequence) return []
  const canonical = aliasCanonical()
  const usable = sequence.orderedRoutes.flatMap((route, index) => {
    if (route.serviceType !== "Regular" || route.stationIds.length < 2) {
      return []
    }
    return [
      {
        id: `tfl:${lineId}:${route.direction}:${index + 1}`,
        name: displayRouteName(route.name),
        direction: route.direction,
        stationIds: route.stationIds.map(canonical),
        paired: false,
      } satisfies TflSequencesPattern,
    ]
  })

  const bySequence = new Map<string, TflSequencesPattern[]>()
  for (const pattern of usable) {
    const key = pattern.stationIds.join("\0")
    const list = bySequence.get(key) ?? []
    list.push(pattern)
    bySequence.set(key, list)
  }

  const used = new Set<string>()
  const patterns: TflSequencesPattern[] = []
  for (const pattern of usable) {
    if (used.has(pattern.id)) continue
    const reverse = bySequence
      .get(reverseJoined(pattern.stationIds))
      ?.find(
        (candidate) =>
          !used.has(candidate.id) &&
          candidate.id !== pattern.id &&
          candidate.direction !== pattern.direction
      )
    used.add(pattern.id)
    if (reverse) {
      used.add(reverse.id)
      patterns.push({
        ...pattern,
        paired: true,
        pairPatternId: reverse.id,
      })
      patterns.push({
        ...reverse,
        paired: true,
        pairPatternId: pattern.id,
      })
      continue
    }
    patterns.push(pattern)
  }
  return patterns
}

const hopsFromPatterns = (
  patterns: readonly TflSequencesPattern[]
): [string, string][] => {
  const seen = new Set<string>()
  const hops: [string, string][] = []
  for (const pattern of patterns) {
    for (let index = 0; index < pattern.stationIds.length - 1; index += 1) {
      const from = pattern.stationIds[index]!
      const to = pattern.stationIds[index + 1]!
      if (!from || !to || from === to) continue
      const key = hopKey(from, to)
      if (seen.has(key)) continue
      seen.add(key)
      hops.push([from, to])
    }
  }
  return hops
}

const movementsFromPatterns = (
  patterns: readonly TflSequencesPattern[]
): DirectedTopologyMovement[] => {
  const byKey = new Map<string, DirectedTopologyMovement>()
  for (const pattern of patterns) {
    for (let index = 1; index < pattern.stationIds.length - 1; index += 1) {
      const from = pattern.stationIds[index - 1]!
      const via = pattern.stationIds[index]!
      const to = pattern.stationIds[index + 1]!
      if (from === via || via === to || from === to) continue
      const key = `${from}|${via}|${to}`
      const existing = byKey.get(key)
      if (existing) {
        if (!existing.patternIds.includes(pattern.id)) {
          existing.patternIds.push(pattern.id)
        }
        continue
      }
      byKey.set(key, {
        id: key,
        from,
        via,
        to,
        patternIds: [pattern.id],
        source: "tfl-station-pattern",
        confidence: "declared",
      })
    }
  }
  return [...byKey.values()]
}

const rawTopologyFromHops = (
  lineId: string,
  hops: readonly [string, string][],
  stations: readonly TrackStation[],
  names: Readonly<Record<string, string>>,
  canonical: (id: string) => string
): ContractedTopology | null => {
  const byId = new Map(stations.map((station) => [station.id, station]))
  const degree = new Map<string, number>()
  for (const [from, to] of hops) {
    degree.set(from, (degree.get(from) ?? 0) + 1)
    degree.set(to, (degree.get(to) ?? 0) + 1)
  }

  const nodes: ContractedNode[] = []
  const seen = new Set<string>()
  for (const stationId of degree.keys()) {
    const coordinates = coordFor(stationId, byId, canonical)
    if (!coordinates) continue
    const id = stationNodeId(stationId)
    if (seen.has(id)) continue
    seen.add(id)
    nodes.push({
      id,
      coordinates,
      stationId,
      stationName: nameFor(stationId, names, canonical),
      kind: (degree.get(stationId) ?? 0) <= 1 ? "terminus" : "station",
    })
  }

  const nodeIds = new Set(nodes.map((node) => node.id))
  const edges: ContractedEdge[] = []
  hops.forEach(([from, to], edgeIndex) => {
    const fromId = stationNodeId(from)
    const toId = stationNodeId(to)
    if (!nodeIds.has(fromId) || !nodeIds.has(toId)) return
    edges.push({
      id: `${lineId}-tfl-e${edgeIndex}`,
      from: fromId,
      to: toId,
      featureId: `${lineId}-tfl`,
    })
  })

  if (nodes.length === 0) return null
  return { nodes, edges }
}

const mapMovementsOntoTopology = (
  topology: ContractedTopology,
  stationMovements: readonly DirectedTopologyMovement[]
): DirectedTopologyMovement[] => {
  const adjacency = new Map<string, Set<string>>()
  const add = (from: string, to: string) => {
    const neighbors = adjacency.get(from) ?? new Set<string>()
    neighbors.add(to)
    adjacency.set(from, neighbors)
  }
  for (const edge of topology.edges) {
    if (edge.kind === "bond") continue
    add(edge.from, edge.to)
    add(edge.to, edge.from)
  }
  const nodeByStationId = new Map(
    topology.nodes.flatMap((node) =>
      node.stationId ? [[node.stationId, node.id] as const] : []
    )
  )
  const mapped: DirectedTopologyMovement[] = []
  for (const movement of stationMovements) {
    const from = nodeByStationId.get(movement.from)
    const via = nodeByStationId.get(movement.via)
    const to = nodeByStationId.get(movement.to)
    if (!from || !via || !to) continue
    const neighbors = adjacency.get(via)
    if (!neighbors || neighbors.size < 2) continue
    if (!neighbors.has(from) || !neighbors.has(to)) continue
    mapped.push({
      ...movement,
      id: `${from}|${via}|${to}`,
      from,
      via,
      to,
    })
  }
  return mapped
}

export const tflSequencesPassengerTopology = (
  lineId: string,
  stations: readonly TrackStation[]
): TflSequencesCompile | null => {
  const sequence = getStaticLineSequence(lineId)
  const patterns = regularRoutePatterns(lineId)
  if (!sequence || patterns.length === 0) return null

  const names: Record<string, string> = {}
  for (const stop of sequence.stations) {
    names[stop.id] = formatStationName(stop.name)
  }

  const hops = hopsFromPatterns(patterns)
  const raw = rawTopologyFromHops(
    lineId,
    hops,
    stations,
    names,
    aliasCanonical()
  )
  if (!raw) return null

  const stationMovements = movementsFromPatterns(patterns)
  const directed = mapMovementsOntoTopology(raw, stationMovements)
  const split = splitBondedThroughStations(raw, directed)
  const unpairedPatternIds = patterns
    .filter((pattern) => !pattern.paired)
    .map((pattern) => pattern.id)

  return {
    lineId: sequence.lineId,
    lineName: sequence.lineName,
    topology: split.topology,
    movements: split.movements,
    patterns,
    unpairedPatternIds,
  }
}
