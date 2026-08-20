import { STATION_HUBS } from "tfl-ts"
import allStations from "@/data/geography/all-stations.json"

export type StationLatLon = {
  lat: number
  lon: number
}

type StationRow = {
  id?: string | number
  properties?: { featureId?: string }
  geometry?: { coordinates?: number[] }
}

const features = (allStations as { features: StationRow[] }).features

let cached: Map<string, StationLatLon> | null = null

const coordFromFeature = (feature: StationRow): StationLatLon | null => {
  const lon = feature.geometry?.coordinates?.[0]
  const lat = feature.geometry?.coordinates?.[1]
  if (lat == null || lon == null) return null
  return { lat, lon }
}

/**
 * Naptan / hub id → WGS84. Built from vendored OSM station points plus
 * `STATION_HUBS` aliases. Used by horizontal branch layout (NWSE weights).
 */
export const stationCoordMap = (): ReadonlyMap<string, StationLatLon> => {
  if (cached) return cached
  const byFeature = new Map<string, StationLatLon>()
  for (const feature of features) {
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
        .find((value): value is StationLatLon => value != null)
    if (!coord) continue
    map.set(id, coord)
    if (hub.hubId) map.set(hub.hubId, coord)
    for (const member of hub.members) map.set(member.id, coord)
    for (const memberId of Object.values(hub.lineMemberIds)) {
      if (memberId) map.set(memberId, coord)
    }
  }
  cached = map
  return map
}

export const stationCoord = (id: string): StationLatLon | null =>
  stationCoordMap().get(id) ?? null

export const meanCoord = (ids: readonly string[]): StationLatLon | null => {
  let lat = 0
  let lon = 0
  let count = 0
  for (const id of ids) {
    const coord = stationCoord(id)
    if (!coord) continue
    lat += coord.lat
    lon += coord.lon
    count += 1
  }
  if (count === 0) return null
  return { lat: lat / count, lon: lon / count }
}
