import type { Feature, LineString } from "geojson"
import type { LineSegmentProperties } from "@/lib/tfl/geography-types"
import type { ServicePatternDataset } from "@/lib/tfl/service-pattern-evidence"
import type {
  ContractedNode,
  ContractedTopology,
} from "@/lib/tfl/geometry/contract-track-topology"
import type { LngLat } from "@/lib/tfl/geometry/transit-track-graph"

export type DirectedTopologyMovement = {
  id: string
  from: string
  via: string
  to: string
  patternIds: string[]
  source: "tfl-station-pattern" | "osm-route-geometry"
  confidence: "declared" | "inferred"
}

export type TopologyMovementPair = {
  id: string
  a: string
  via: string
  b: string
  directions: DirectedTopologyMovement[]
}

const METERS_PER_DEG_LAT = 111_320
const REF_LAT = 51.5
const METERS_PER_DEG_LNG =
  METERS_PER_DEG_LAT * Math.cos((REF_LAT * Math.PI) / 180)

const deltaMetres = (from: LngLat, to: LngLat) => ({
  x: (to[0] - from[0]) * METERS_PER_DEG_LNG,
  y: (to[1] - from[1]) * METERS_PER_DEG_LAT,
})

const distanceMetres = (left: LngLat, right: LngLat): number => {
  const delta = deltaMetres(left, right)
  return Math.hypot(delta.x, delta.y)
}

const adjacencyFor = (topology: ContractedTopology): Map<string, string[]> => {
  const adjacency = new Map<string, Set<string>>()
  const add = (from: string, to: string) => {
    const neighbors = adjacency.get(from) ?? new Set<string>()
    neighbors.add(to)
    adjacency.set(from, neighbors)
  }
  for (const edge of topology.edges) {
    add(edge.from, edge.to)
    add(edge.to, edge.from)
  }
  return new Map(
    [...adjacency].map(([nodeId, neighbors]) => [nodeId, [...neighbors]])
  )
}

const featurePatternId = (
  feature: Feature<LineString, LineSegmentProperties>
): string =>
  String(feature.id ?? feature.properties.featureId).replace(/-\d+$/, "")

const closestCoordinateIndex = (
  target: LngLat,
  coordinates: readonly LngLat[]
): { index: number; distance: number } | null => {
  let bestIndex = -1
  let bestDistance = Number.POSITIVE_INFINITY
  for (let index = 0; index < coordinates.length; index += 1) {
    const distance = distanceMetres(target, coordinates[index]!)
    if (distance < bestDistance) {
      bestIndex = index
      bestDistance = distance
    }
  }
  return bestIndex < 0 ? null : { index: bestIndex, distance: bestDistance }
}

const sampleAwayFrom = (
  origin: LngLat,
  coordinates: readonly LngLat[],
  index: number,
  step: -1 | 1,
  targetDistanceM = 80
): LngLat | null => {
  let candidate: LngLat | null = null
  for (
    let cursor = index + step;
    cursor >= 0 && cursor < coordinates.length;
    cursor += step
  ) {
    candidate = coordinates[cursor]!
    if (distanceMetres(origin, candidate) >= targetDistanceM) return candidate
  }
  return candidate && distanceMetres(origin, candidate) >= 8 ? candidate : null
}

const nearestLeg = (
  junction: ContractedNode,
  sample: LngLat,
  neighborIds: readonly string[],
  nodeById: ReadonlyMap<string, ContractedNode>,
  topology: ContractedTopology
): string | null => {
  const sampleDelta = deltaMetres(junction.coordinates, sample)
  const sampleLength = Math.hypot(sampleDelta.x, sampleDelta.y)
  if (sampleLength === 0) return null
  let best: string | null = null
  let bestCos = -Infinity
  for (const neighborId of neighborIds) {
    const neighbor = nodeById.get(neighborId)
    if (!neighbor) continue
    const edge = topology.edges.find(
      (candidate) =>
        (candidate.from === junction.id && candidate.to === neighborId) ||
        (candidate.to === junction.id && candidate.from === neighborId)
    )
    const edgeCoordinates = edge?.coordinates
    const orientedCoordinates =
      edgeCoordinates && edge?.to === junction.id
        ? [...edgeCoordinates].reverse()
        : edgeCoordinates
    const tangentSample = orientedCoordinates
      ? sampleAwayFrom(junction.coordinates, orientedCoordinates, 0, 1, 80)
      : null
    const neighborDelta = deltaMetres(
      junction.coordinates,
      tangentSample ?? neighbor.coordinates
    )
    const neighborLength = Math.hypot(neighborDelta.x, neighborDelta.y)
    if (neighborLength === 0) continue
    const cosine =
      (sampleDelta.x * neighborDelta.x + sampleDelta.y * neighborDelta.y) /
      (sampleLength * neighborLength)
    if (cosine > bestCos) {
      best = neighborId
      bestCos = cosine
    }
  }
  return bestCos >= 0.35 ? best : null
}

const directedMovementKey = (from: string, via: string, to: string): string =>
  `${from}|${via}|${to}`

const upsertDirectedMovement = (
  movements: Map<string, DirectedTopologyMovement>,
  movement: Omit<DirectedTopologyMovement, "id"> & { id?: string }
) => {
  const key = directedMovementKey(movement.from, movement.via, movement.to)
  const existing = movements.get(key)
  if (!existing) {
    movements.set(key, {
      id: key,
      from: movement.from,
      via: movement.via,
      to: movement.to,
      patternIds: [...movement.patternIds],
      source: movement.source,
      confidence: movement.confidence,
    })
    return
  }
  for (const patternId of movement.patternIds) {
    if (!existing.patternIds.includes(patternId)) {
      existing.patternIds.push(patternId)
    }
  }
  if (movement.confidence === "declared") existing.confidence = "declared"
  if (movement.source === "tfl-station-pattern") {
    existing.source = "tfl-station-pattern"
  }
}

const addMovement = (
  movements: Map<string, DirectedTopologyMovement>,
  movement: Omit<DirectedTopologyMovement, "id" | "patternIds"> & {
    patternId: string
  }
) => {
  upsertDirectedMovement(movements, {
    ...movement,
    patternIds: [movement.patternId],
  })
}

export const osmMovementsForTopology = (
  topology: ContractedTopology,
  variants: readonly Feature<LineString, LineSegmentProperties>[],
  options?: { junctionToleranceM?: number }
): DirectedTopologyMovement[] => {
  const toleranceM = options?.junctionToleranceM ?? 140
  const adjacency = adjacencyFor(topology)
  const nodeById = new Map(topology.nodes.map((node) => [node.id, node]))
  const throughNodes = topology.nodes.filter(
    (node) => (adjacency.get(node.id)?.length ?? 0) >= 2
  )
  const movements = new Map<string, DirectedTopologyMovement>()

  for (const junction of throughNodes) {
    const neighborIds = adjacency.get(junction.id) ?? []
    for (const feature of variants) {
      const coordinates = feature.geometry.coordinates as LngLat[]
      const closest = closestCoordinateIndex(junction.coordinates, coordinates)
      if (!closest || closest.distance > toleranceM) continue
      const before = sampleAwayFrom(
        junction.coordinates,
        coordinates,
        closest.index,
        -1
      )
      const after = sampleAwayFrom(
        junction.coordinates,
        coordinates,
        closest.index,
        1
      )
      if (!before || !after) continue
      const from = nearestLeg(junction, before, neighborIds, nodeById, topology)
      const to = nearestLeg(junction, after, neighborIds, nodeById, topology)
      if (!from || !to || from === to) continue
      addMovement(movements, {
        from,
        via: junction.id,
        to,
        patternId: featurePatternId(feature),
        source: "osm-route-geometry",
        confidence: "inferred",
      })
    }
  }

  return [...movements.values()]
}

export const tflMovementsForTopology = (
  topology: ContractedTopology,
  dataset: ServicePatternDataset | null
): DirectedTopologyMovement[] => {
  if (!dataset) return []
  const adjacency = adjacencyFor(topology)
  const nodeByStationId = new Map(
    topology.nodes.flatMap((node) =>
      node.stationId ? [[node.stationId, node.id] as const] : []
    )
  )
  const movements = new Map<string, DirectedTopologyMovement>()
  for (const movement of dataset.movements) {
    const from = nodeByStationId.get(movement.fromStationId)
    const via = nodeByStationId.get(movement.viaStationId)
    const to = nodeByStationId.get(movement.toStationId)
    if (!from || !via || !to) continue
    if ((adjacency.get(via)?.length ?? 0) < 2) continue
    if (
      !adjacency.get(via)?.includes(from) ||
      !adjacency.get(via)?.includes(to)
    ) {
      continue
    }
    upsertDirectedMovement(movements, {
      from,
      via,
      to,
      patternIds: movement.patternIds,
      source: "tfl-station-pattern",
      confidence: "declared",
    })
  }
  return [...movements.values()]
}

export const movementPairs = (
  movements: readonly DirectedTopologyMovement[]
): TopologyMovementPair[] => {
  const byPair = new Map<
    string,
    Omit<TopologyMovementPair, "directions"> & {
      directions: Map<string, DirectedTopologyMovement>
    }
  >()
  for (const movement of movements) {
    const [a, b] = [movement.from, movement.to].sort()
    const key = `${movement.via}|${a}|${b}`
    const pair = byPair.get(key) ?? {
      id: key,
      a: a!,
      via: movement.via,
      b: b!,
      directions: new Map(),
    }
    upsertDirectedMovement(pair.directions, movement)
    byPair.set(key, pair)
  }
  return [...byPair.values()].map((pair) => ({
    id: pair.id,
    a: pair.a,
    via: pair.via,
    b: pair.b,
    directions: [...pair.directions.values()],
  }))
}
