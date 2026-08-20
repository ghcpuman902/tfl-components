import type { LineString } from "geojson"
import { getLineColor, STATION_HUBS } from "tfl-ts"
import allStations from "@/data/geography/all-stations.json"
import hopTimesJson from "@/data/geography/line-hop-times.json"
import tubeStops from "@/data/geography/osm-cache/tube-route-stops.json"
import overgroundStops from "@/data/geography/osm-cache/overground-route-stops.json"
import elizabethStops from "@/data/geography/osm-cache/elizabeth-route-stops.json"
import dlrStops from "@/data/geography/osm-cache/dlr-route-stops.json"
import tramStops from "@/data/geography/osm-cache/tram-route-stops.json"
import tubeCentre from "@/data/geography/unique-track/tube/full.json"
import overgroundCentre from "@/data/geography/unique-track/overground/full.json"
import elizabethCentre from "@/data/geography/unique-track/elizabeth/full.json"
import dlrCentre from "@/data/geography/unique-track/dlr/full.json"
import tramCentre from "@/data/geography/unique-track/tram/full.json"
import type {
  TransitGeometryBundle,
  TransitMode,
} from "@/lib/tfl/geography-types"
import {
  hopSegmentsFromBundle,
  hopSegmentsToPolylines,
  stationsFromBundleForLine,
} from "@/lib/tfl/geometry/rail-hop-segments"
import {
  mergeOsmStationPositions,
  type OsmRouteStopsFile,
} from "@/lib/tfl/geometry/osm-route-stops"
import type { LineHopTimesSnapshot } from "@/lib/tfl/geometry/line-hop-times"
import type { RoutePolyline, StationCoord } from "@/lib/tfl/vehicle-progress"

type StationRow = {
  id?: string | number
  properties?: { featureId?: string }
  geometry?: { coordinates?: number[] }
}

const stations = allStations as { features: StationRow[] }

const UNIQUE_TRACK: Record<TransitMode, TransitGeometryBundle> = {
  tube: tubeCentre as TransitGeometryBundle,
  overground: overgroundCentre as TransitGeometryBundle,
  elizabeth: elizabethCentre as TransitGeometryBundle,
  dlr: dlrCentre as TransitGeometryBundle,
  tram: tramCentre as TransitGeometryBundle,
}

const OSM_STOPS: Record<TransitMode, OsmRouteStopsFile> = {
  tube: tubeStops as unknown as OsmRouteStopsFile,
  overground: overgroundStops as unknown as OsmRouteStopsFile,
  elizabeth: elizabethStops as unknown as OsmRouteStopsFile,
  dlr: dlrStops as unknown as OsmRouteStopsFile,
  tram: tramStops as unknown as OsmRouteStopsFile,
}

const hopTimes = (hopTimesJson as LineHopTimesSnapshot).lines

const hopPolylineCache = new Map<string, RoutePolyline[]>()

const coordFromFeature = (feature: StationRow): StationCoord | null => {
  const lon = feature.geometry?.coordinates?.[0]
  const lat = feature.geometry?.coordinates?.[1]
  if (lat == null || lon == null) return null
  return { lat, lon }
}

/**
 * Arrival naptans (`940GZZLUVIC`) and geometry ids (`HUBVIC`) both resolve
 * to the same coordinate via `STATION_HUBS`.
 */
export const railStationsById = (): Map<string, StationCoord> => {
  const byFeature = new Map<string, StationCoord>()
  for (const feature of stations.features) {
    const id = String(feature.id ?? feature.properties?.featureId ?? "")
    const coord = coordFromFeature(feature)
    if (!id || !coord) continue
    byFeature.set(id, coord)
  }

  const map = new Map(byFeature)
  for (const [id, hub] of Object.entries(STATION_HUBS)) {
    const coord =
      byFeature.get(id) ??
      (hub.hubId ? byFeature.get(hub.hubId) : undefined) ??
      hub.members
        .map((member) => byFeature.get(member.id))
        .find((value): value is StationCoord => value != null)
    if (!coord) continue
    map.set(id, coord)
    if (hub.hubId) map.set(hub.hubId, coord)
    for (const member of hub.members) map.set(member.id, coord)
    for (const memberId of Object.values(hub.lineMemberIds)) {
      if (memberId) map.set(memberId, coord)
    }
  }
  return map
}

const OVERGROUND_LINE_IDS = new Set([
  "london-overground",
  "mildmay",
  "windrush",
  "liberty",
  "lioness",
  "suffragette",
  "weaver",
])

export const railModeForLineId = (lineId: string): TransitMode => {
  if (lineId === "elizabeth") return "elizabeth"
  if (lineId === "dlr") return "dlr"
  if (lineId === "tram") return "tram"
  if (OVERGROUND_LINE_IDS.has(lineId)) return "overground"
  return "tube"
}

export const railModesForLineIds = (
  lineIds: readonly string[]
): TransitMode[] => [...new Set(lineIds.map(railModeForLineId))]

export const railVehicleColor = (lineId: string): string =>
  getLineColor(lineId).hex

const uniqueTrackFallback = (lineId: string): RoutePolyline[] => {
  const bundle = UNIQUE_TRACK[railModeForLineId(lineId)]
  return (bundle.lines.features ?? [])
    .filter((feature) => feature.properties?.lineId === lineId)
    .filter(
      (feature): feature is typeof feature & { geometry: LineString } =>
        feature.geometry.type === "LineString"
    )
    .map((feature) => ({ lineId, line: feature.geometry }))
}

/** Unique-track hop between adjacent stops, or the line's centreline if a hop is missing. */
export const railPolylinesForLine = (lineId: string): RoutePolyline[] => {
  const cached = hopPolylineCache.get(lineId)
  if (cached) return cached

  const mode = railModeForLineId(lineId)
  const bundle = UNIQUE_TRACK[mode]
  const tflStations = stationsFromBundleForLine(bundle, lineId)
  const stationsForLine = mergeOsmStationPositions(
    tflStations,
    OSM_STOPS[mode].stops
  ).filter((station) => !station.id.startsWith("osm-stop:"))
  const segments = hopSegmentsFromBundle(bundle, lineId, {
    hopMinutes: hopTimes[lineId]?.hops,
    stations: stationsForLine,
  })
  const hops = hopSegmentsToPolylines(segments)
  const fallback = uniqueTrackFallback(lineId)
  const polylines = hops.length > 0 ? [...hops, ...fallback] : fallback
  hopPolylineCache.set(lineId, polylines)
  return polylines
}

export const railPolylinesForLines = (
  lineIds: readonly string[]
): RoutePolyline[] => lineIds.flatMap((lineId) => railPolylinesForLine(lineId))
