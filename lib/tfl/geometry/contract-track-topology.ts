/**
 * Contract unique-track polylines to station + branch-point topology.
 * Interior vertices between those keeps are dropped; connectivity is unchanged.
 * Junctions (shared weld vertices) stay as their own nodes — they are never
 * merged into a nearby station.
 */
import type { Feature, LineString } from "geojson"
import type { LineSegmentProperties } from "@/lib/tfl/geography-types"
import {
  TRACK_GRAPH,
  pointKey,
  type LngLat,
  type TrackStation,
} from "@/lib/tfl/geometry/transit-track-graph"

export type ContractedNodeKind = "station" | "junction" | "terminus"

export type ContractedNode = {
  id: string
  coordinates: LngLat
  stationId?: string
  stationName?: string
  /** Nearest station to a junction — for inspect labels, not identity. */
  nearStationName?: string
  kind: ContractedNodeKind
  /**
   * Set when this node is one half of a flying-junction split (see
   * `splitFlyingJunctions`): the id of the weld vertex it was split from,
   * shared by both halves.
   */
  splitFrom?: string
}

export type ContractedEdgeKind = "track" | "bond"

export type ContractedEdge = {
  id: string
  from: string
  to: string
  featureId: string
  trackGroup?: 0 | 1
  /** Source-track run between the retained nodes. Used for local junction tangents. */
  coordinates?: LngLat[]
  /**
   * Timetable hop class.
   * Spine is the default passenger corridor.
   * Fast is a regular scheduled skip or express.
   * Occasional is weekend-only or a rare adjustment.
   */
  service?: "spine" | "fast" | "occasional"
  /** Short reason for the hop class, for hover titles. */
  serviceNote?: string
  /**
   * "bond" marks the short synthetic link `splitFlyingJunctions` adds between
   * the two halves of a split weld vertex — not a real running track.
   * Absent (or "track") means an ordinary running-track edge.
   */
  kind?: ContractedEdgeKind
}

export type ContractedTopology = {
  nodes: ContractedNode[]
  edges: ContractedEdge[]
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

const nearestStation = (
  point: LngLat,
  stations: readonly TrackStation[],
  radiusM: number
): TrackStation | null => {
  let best: TrackStation | null = null
  let bestDist = radiusM
  for (const station of stations) {
    const dist = distMetres(point, station.coordinates)
    if (dist <= bestDist) {
      best = station
      bestDist = dist
    }
  }
  return best
}

const stationNodeId = (station: TrackStation): string => `s:${station.id}`
const junctionNodeId = (point: LngLat): string => `j:${pointKey(point)}`

const asCoords = (feature: Feature<LineString, LineSegmentProperties>) =>
  feature.geometry.coordinates as LngLat[]

export const contractTrackTopology = (
  features: readonly Feature<LineString, LineSegmentProperties>[],
  stations: readonly TrackStation[],
  options?: { stationSnapM?: number }
): ContractedTopology => {
  const snapM = options?.stationSnapM ?? TRACK_GRAPH.STATION_SNAP_M
  const featuresWithKey = new Map<string, Set<string>>()
  const endpointKeys = new Set<string>()

  for (const feature of features) {
    const coords = asCoords(feature)
    if (coords.length < 2) continue
    const featureId = feature.properties.featureId
    endpointKeys.add(pointKey(coords[0]!))
    endpointKeys.add(pointKey(coords[coords.length - 1]!))
    for (const point of coords) {
      const key = pointKey(point)
      const owners = featuresWithKey.get(key) ?? new Set()
      owners.add(featureId)
      featuresWithKey.set(key, owners)
    }
  }

  const isJunctionKey = (key: string): boolean =>
    endpointKeys.has(key) && (featuresWithKey.get(key)?.size ?? 0) >= 2

  const nodes = new Map<string, ContractedNode>()
  const edges: ContractedEdge[] = []
  const degree = new Map<string, number>()

  const ensure = (node: ContractedNode): ContractedNode => {
    const existing = nodes.get(node.id)
    if (existing) return existing
    nodes.set(node.id, node)
    return node
  }

  const stationNode = (station: TrackStation): ContractedNode =>
    ensure({
      id: stationNodeId(station),
      coordinates: station.coordinates,
      kind: "station",
      stationId: station.id,
      stationName: station.label ?? station.name,
    })

  const junctionNode = (point: LngLat): ContractedNode => {
    const nearby = nearestStation(point, stations, 400)
    return ensure({
      id: junctionNodeId(point),
      coordinates: point,
      kind: "junction",
      ...(nearby ? { nearStationName: nearby.label ?? nearby.name } : {}),
    })
  }

  const link = (
    from: ContractedNode,
    to: ContractedNode,
    feature: Feature<LineString, LineSegmentProperties>,
    edgeIndex: number,
    coordinates: readonly LngLat[]
  ) => {
    if (from.id === to.id) return
    edges.push({
      id: `${feature.properties.featureId}-e${edgeIndex}`,
      from: from.id,
      to: to.id,
      featureId: feature.properties.featureId,
      trackGroup: feature.properties.trackGroup,
      coordinates:
        coordinates.length >= 2
          ? [...coordinates]
          : [from.coordinates, to.coordinates],
    })
    degree.set(from.id, (degree.get(from.id) ?? 0) + 1)
    degree.set(to.id, (degree.get(to.id) ?? 0) + 1)
  }

  let edgeIndex = 0
  for (const feature of features) {
    const coords = asCoords(feature)
    if (coords.length < 2) continue
    let prev: ContractedNode | null = null
    let prevStationId: string | undefined
    let run: LngLat[] = []

    for (let index = 0; index < coords.length; index += 1) {
      const point = coords[index]!
      if (prev && pointKey(run[run.length - 1] ?? point) !== pointKey(point)) {
        run.push(point)
      }
      const key = pointKey(point)
      const isEnd = index === 0 || index === coords.length - 1
      const junction = isJunctionKey(key)
      const station = nearestStation(point, stations, snapM)

      const emit: ContractedNode[] = []
      if (junction) {
        if (station && station.id !== prevStationId) {
          emit.push(stationNode(station))
        }
        emit.push(junctionNode(point))
      } else if (station && station.id !== prevStationId) {
        emit.push(stationNode(station))
      } else if (isEnd && !station && !prev) {
        emit.push(
          ensure({
            id: junctionNodeId(point),
            coordinates: point,
            kind: "terminus",
          })
        )
      } else if (isEnd && !station && prev) {
        emit.push(
          ensure({
            id: junctionNodeId(point),
            coordinates: point,
            kind: "terminus",
          })
        )
      }

      for (const node of emit) {
        if (prev) {
          link(prev, node, feature, edgeIndex, run)
          edgeIndex += 1
        }
        prev = node
        run = [point]
        prevStationId = node.stationId ?? prevStationId
      }
      if (station) prevStationId = station.id
    }
  }

  const labelled = [...nodes.values()].map((node) => {
    if (node.kind === "station") return node
    if (node.kind === "junction") return node
    const n = degree.get(node.id) ?? 0
    return {
      ...node,
      kind: n <= 1 ? ("terminus" as const) : ("junction" as const),
    }
  })

  return splitFlyingJunctions({ nodes: labelled, edges })
}

/** Metres the two halves of a split weld sit either side of the original point. */
const SPLIT_OFFSET_M = 6

const groupEdgesByFeature = (
  edges: readonly ContractedEdge[]
): ContractedEdge[][] => {
  const groups = new Map<string, ContractedEdge[]>()
  for (const edge of edges) {
    const group = groups.get(edge.featureId) ?? []
    group.push(edge)
    groups.set(edge.featureId, group)
  }
  return [...groups.values()]
}

/**
 * Direction (in metres, junction-local) that `edge` heads away from `originId`,
 * preferring the retained polyline tangent over the straight line to the
 * neighbour node so curved approaches still separate sensibly.
 */
const edgeTangentFrom = (
  edge: ContractedEdge,
  originId: string,
  origin: ContractedNode,
  nodeById: ReadonlyMap<string, ContractedNode>
): { x: number; y: number } => {
  const coordinates = edge.coordinates
  if (coordinates && coordinates.length >= 2) {
    const oriented =
      edge.to === originId ? [...coordinates].reverse() : coordinates
    const start = oriented[0]!
    for (let index = 1; index < oriented.length; index += 1) {
      const point = oriented[index]!
      const dx = (point[0] - start[0]) * METERS_PER_DEG_LNG
      const dy = (point[1] - start[1]) * METERS_PER_DEG_LAT
      if (Math.hypot(dx, dy) > 1) return { x: dx, y: dy }
    }
  }
  const otherId = edge.from === originId ? edge.to : edge.from
  const other = nodeById.get(otherId)
  if (!other) return { x: 0, y: 0 }
  return {
    x: (other.coordinates[0] - origin.coordinates[0]) * METERS_PER_DEG_LNG,
    y: (other.coordinates[1] - origin.coordinates[1]) * METERS_PER_DEG_LAT,
  }
}

const offsetCoordinates = (point: LngLat, dxM: number, dyM: number): LngLat => [
  point[0] + dxM / METERS_PER_DEG_LNG,
  point[1] + dyM / METERS_PER_DEG_LAT,
]

/**
 * Splits a "diamond"/flying-junction weld — one geometric point where two
 * independent through-routes cross — into a pair of adjacent nodes joined by
 * a short synthetic bond edge, instead of one vertex with every leg fanning
 * out of it. Mirrors the printed Tube map's own device for this shape (e.g.
 * Kennington, Euston, Camden Town): the crossing itself is never a station,
 * so it never becomes a single congested vertex — each real through-route
 * keeps its own point, and the two points sit close enough to read as one
 * place. Only fires when a junction's incident edges split cleanly into
 * groups of exactly two sharing a `featureId` (one through-route each); any
 * messier shape is left as a single junction node.
 */
export const splitFlyingJunctions = (
  topology: ContractedTopology
): ContractedTopology => {
  const nodeById = new Map(topology.nodes.map((node) => [node.id, node]))
  const incidentByNode = new Map<string, ContractedEdge[]>()
  for (const edge of topology.edges) {
    incidentByNode.set(edge.from, [
      ...(incidentByNode.get(edge.from) ?? []),
      edge,
    ])
    incidentByNode.set(edge.to, [...(incidentByNode.get(edge.to) ?? []), edge])
  }

  const nodes: ContractedNode[] = []
  const endpointRemap = new Map<string, Map<string, string>>()
  const bonds: ContractedEdge[] = []

  for (const node of topology.nodes) {
    const incident = incidentByNode.get(node.id) ?? []
    if (node.kind !== "junction" || incident.length < 4) {
      nodes.push(node)
      continue
    }

    const groups = groupEdgesByFeature(incident)
    const cleanSplit =
      groups.length === 2 &&
      groups.every((group) => group.length === 2) &&
      groups.reduce((sum, group) => sum + group.length, 0) === incident.length
    if (!cleanSplit) {
      nodes.push(node)
      continue
    }

    const [groupA, groupB] = groups as [ContractedEdge[], ContractedEdge[]]
    const tangentA = edgeTangentFrom(groupA[0]!, node.id, node, nodeById)
    const tangentLength = Math.hypot(tangentA.x, tangentA.y) || 1
    const perp = {
      x: -tangentA.y / tangentLength,
      y: tangentA.x / tangentLength,
    }

    const idA = `${node.id}~a`
    const idB = `${node.id}~b`
    nodes.push({
      ...node,
      id: idA,
      coordinates: offsetCoordinates(
        node.coordinates,
        perp.x * SPLIT_OFFSET_M,
        perp.y * SPLIT_OFFSET_M
      ),
      splitFrom: node.id,
    })
    nodes.push({
      ...node,
      id: idB,
      coordinates: offsetCoordinates(
        node.coordinates,
        -perp.x * SPLIT_OFFSET_M,
        -perp.y * SPLIT_OFFSET_M
      ),
      splitFrom: node.id,
    })

    const remap = endpointRemap.get(node.id) ?? new Map<string, string>()
    for (const edge of groupA) remap.set(edge.id, idA)
    for (const edge of groupB) remap.set(edge.id, idB)
    endpointRemap.set(node.id, remap)

    bonds.push({
      id: `${node.id}-bond`,
      from: idA,
      to: idB,
      featureId: `${node.id}-bond`,
      kind: "bond",
    })
  }

  if (endpointRemap.size === 0) return topology

  const edges = topology.edges.map((edge) => {
    const fromReplacement = endpointRemap.get(edge.from)?.get(edge.id)
    const toReplacement = endpointRemap.get(edge.to)?.get(edge.id)
    if (!fromReplacement && !toReplacement) return edge
    return {
      ...edge,
      from: fromReplacement ?? edge.from,
      to: toReplacement ?? edge.to,
    }
  })

  return { nodes, edges: [...edges, ...bonds] }
}
