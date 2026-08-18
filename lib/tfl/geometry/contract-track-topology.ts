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
}

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

  return { nodes: labelled, edges }
}
