/**
 * Merge TfL station identity with OSM-native stop-position coordinates.
 *
 * `scripts/fetch-osm-route-stops.ts` reads the ordered `stop` members off
 * each mode's real OSM route relations and caches them to
 * `data/geography/osm-cache/{mode}-route-stops.json`. Those coordinates are
 * authored against the same track geometry that becomes our merged
 * polyline, so matching stations by name and taking the OSM position avoids
 * the cross-source drift that made distance-based snapping (TfL point →
 * nearest surviving OSM vertex, within a fixed radius) silently drop
 * stations after welding/simplification — see contract-track-topology.ts.
 */
import type {
  LngLat,
  TrackStation,
} from "@/lib/tfl/geometry/transit-track-graph"

export type OsmRouteStop = {
  nodeId: number
  name: string
  coordinates: LngLat
}

export type OsmRouteRelationStop = {
  nodeId: number
  role: string
  name?: string
  coordinates?: LngLat
}

export type OsmRouteRelation = {
  relationId: number
  tags: Record<string, string>
  stops: OsmRouteRelationStop[]
}

export type OsmRouteStopsFile = {
  meta: {
    schemaVersion?: number
    relationCount: number
    retrievedAt: string
  }
  stops: OsmRouteStop[]
  relations?: OsmRouteRelation[]
}

const normaliseStationName = (name: string): string =>
  name
    .toLowerCase()
    .replace(/^london /, "")
    .replace(/\s*\([^)]*\)\s*$/, "") // trailing disambiguator, e.g. "Burnham (Berks)"
    .replace(/\s*&\s*/g, " and ")
    .replace(/\brail station\b/g, "")
    .replace(/\bunderground station\b/g, "")
    .replace(/\bdlr station\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()

const averageCoordinates = (points: readonly LngLat[]): LngLat => [
  points.reduce((sum, p) => sum + p[0], 0) / points.length,
  points.reduce((sum, p) => sum + p[1], 0) / points.length,
]

/** One averaged OSM position per normalised station name (dedupes platform-specific stop nodes a few metres apart). */
export const groupOsmStopsByName = (
  stops: readonly OsmRouteStop[]
): Map<string, { coordinates: LngLat; name: string }> => {
  const byKey = new Map<string, { points: LngLat[]; name: string }>()
  for (const stop of stops) {
    const key = normaliseStationName(stop.name)
    const entry = byKey.get(key) ?? { points: [], name: stop.name }
    entry.points.push(stop.coordinates)
    byKey.set(key, entry)
  }
  const out = new Map<string, { coordinates: LngLat; name: string }>()
  for (const [key, entry] of byKey) {
    out.set(key, {
      coordinates: averageCoordinates(entry.points),
      name: entry.name,
    })
  }
  return out
}

export const mergeOsmStationPositions = (
  tflStations: readonly TrackStation[],
  osmStops: readonly OsmRouteStop[]
): TrackStation[] => {
  const osmByName = groupOsmStopsByName(osmStops)
  const matchedKeys = new Set<string>()

  const merged = tflStations.map((station) => {
    const key = normaliseStationName(station.label ?? station.name)
    const osm = osmByName.get(key)
    if (!osm) return station
    matchedKeys.add(key)
    return { ...station, coordinates: osm.coordinates }
  })

  for (const [key, osm] of osmByName) {
    if (matchedKeys.has(key)) continue
    merged.push({
      id: `osm-stop:${key}`,
      name: osm.name,
      label: osm.name,
      coordinates: osm.coordinates,
    })
  }

  return merged
}
