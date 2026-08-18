/**
 * Crop unique-track geometry and contracted topology to a real junction
 * window. Used by the temp junction research page so every diagram is a
 * slice of OSM / TfL data, not a hand-drawn star.
 */
import type { Feature, LineString } from "geojson"
import type {
  LineSegmentProperties,
  TransitGeometryBundle,
} from "@/lib/tfl/geography-types"
import type {
  ContractedNode,
  ContractedTopology,
} from "@/lib/tfl/geometry/contract-track-topology"
import type { LngLat } from "@/lib/tfl/geometry/transit-track-graph"

export type LonLatBounds = {
  minLng: number
  maxLng: number
  minLat: number
  maxLat: number
}

const METERS_PER_DEG_LAT = 111_320

const metresPerDegLng = (lat: number) =>
  METERS_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180)

export const pointInBounds = (point: LngLat, bounds: LonLatBounds): boolean =>
  point[0] >= bounds.minLng &&
  point[0] <= bounds.maxLng &&
  point[1] >= bounds.minLat &&
  point[1] <= bounds.maxLat

export const boundsAround = (
  points: readonly LngLat[],
  radiusM: number
): LonLatBounds | null => {
  if (points.length === 0) return null
  const lngs = points.map((point) => point[0])
  const lats = points.map((point) => point[1])
  const midLat = (Math.min(...lats) + Math.max(...lats)) / 2
  const dLat = radiusM / METERS_PER_DEG_LAT
  const dLng = radiusM / Math.max(metresPerDegLng(midLat), 1)
  return {
    minLng: Math.min(...lngs) - dLng,
    maxLng: Math.max(...lngs) + dLng,
    minLat: Math.min(...lats) - dLat,
    maxLat: Math.max(...lats) + dLat,
  }
}

const clipLineString = (
  coordinates: readonly LngLat[],
  bounds: LonLatBounds
): LngLat[][] => {
  const runs: LngLat[][] = []
  let run: LngLat[] = []

  for (let index = 0; index < coordinates.length; index += 1) {
    const point = coordinates[index]!
    const inside = pointInBounds(point, bounds)
    const previous = index > 0 ? coordinates[index - 1]! : null
    const previousInside = previous ? pointInBounds(previous, bounds) : false

    if (inside) {
      if (run.length === 0 && previous) run.push(previous)
      run.push(point)
      continue
    }
    if (previousInside && previous) {
      run.push(point)
      if (run.length >= 2) runs.push(run)
      run = []
    }
  }

  if (run.length >= 2) runs.push(run)
  return runs
}

export const cropBundleToBounds = (
  bundle: TransitGeometryBundle,
  bounds: LonLatBounds,
  lineIds?: readonly string[]
): TransitGeometryBundle => {
  const allow = lineIds?.length ? new Set(lineIds) : null
  const lines: Feature<LineString, LineSegmentProperties>[] = []

  for (const feature of bundle.lines.features ?? []) {
    if (allow && !allow.has(feature.properties.lineId)) continue
    if (feature.geometry?.type !== "LineString") continue
    const runs = clipLineString(
      feature.geometry.coordinates as LngLat[],
      bounds
    )
    runs.forEach((coordinates, runIndex) => {
      lines.push({
        type: "Feature",
        id:
          runs.length === 1
            ? feature.id
            : `${String(feature.id ?? feature.properties.featureId)}-crop${runIndex}`,
        properties: {
          ...feature.properties,
          featureId:
            runs.length === 1
              ? feature.properties.featureId
              : `${feature.properties.featureId}-crop${runIndex}`,
        },
        geometry: { type: "LineString", coordinates },
      })
    })
  }

  return {
    lines: { type: "FeatureCollection", features: lines },
    stations: {
      type: "FeatureCollection",
      features: (bundle.stations.features ?? []).filter((feature) => {
        if (feature.geometry?.type !== "Point") return false
        const coords = feature.geometry.coordinates
        if (coords.length < 2) return false
        if (
          allow &&
          !feature.properties.lineIds.some((lineId) => allow.has(lineId))
        ) {
          return false
        }
        return pointInBounds([coords[0]!, coords[1]!], bounds)
      }),
    },
  }
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

export const nodesMatchingStation = (
  topology: ContractedTopology,
  query: string
): ContractedNode[] => {
  const needle = query.trim().toLowerCase()
  if (!needle) return []
  return topology.nodes.filter((node) => {
    const names = [node.stationName, node.nearStationName]
    return names.some((name) => name?.toLowerCase().includes(needle))
  })
}

export const neighborhoodTopology = (
  topology: ContractedTopology,
  seedIds: readonly string[],
  hops: number
): ContractedTopology => {
  const adjacency = adjacencyFor(topology)
  const keep = new Set(seedIds)
  let frontier = [...seedIds]
  for (let hop = 0; hop < hops; hop += 1) {
    const next: string[] = []
    for (const id of frontier) {
      for (const neighbor of adjacency.get(id) ?? []) {
        if (keep.has(neighbor)) continue
        keep.add(neighbor)
        next.push(neighbor)
      }
    }
    frontier = next
  }
  return {
    nodes: topology.nodes.filter((node) => keep.has(node.id)),
    edges: topology.edges.filter(
      (edge) => keep.has(edge.from) && keep.has(edge.to)
    ),
  }
}
