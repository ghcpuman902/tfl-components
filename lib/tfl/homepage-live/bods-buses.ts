import {
  BODS_STALE_MS,
  matchBodsLine,
  type BodsVehicleActivity,
} from "@/lib/tfl/bods-siri-vm"

/** A bus with a GPS fix, as the homepage map draws it. */
export type MapBus = {
  id: string
  route: string
  lat: number
  lon: number
  bearingDeg: number
  destination: string
  /** Epoch ms of the fix. */
  at: number
  /** The fix is older than 90 s: still drawn (until `BODS_STALE_MS`), but dimmed. */
  stale: boolean
}

export const BUS_FIX_STALE_MS = 90_000
export const BUS_MAP_RADIUS_M = 2_000
export const MAX_MAP_BUSES = 150

const metres = (
  a: { lat: number; lon: number },
  b: { lat: number; lon: number }
) => {
  const rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad
  const dLon = (b.lon - a.lon) * rad
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2
  return 2 * 6371000 * Math.asin(Math.sqrt(h))
}

/**
 * The one all-London BODS read, narrowed to what the map shows: buses on the
 * routes that serve the selected stop, within 2 km of it, with a fix no older
 * than `BODS_STALE_MS` (BODS keeps old rows). Nearest first, capped.
 */
export const busesNearStop = (
  activities: readonly BodsVehicleActivity[],
  routeIds: readonly string[],
  stop: { lat: number; lon: number },
  asOf: number,
  radiusM = BUS_MAP_RADIUS_M
): MapBus[] => {
  const routes = routeIds.map((id) => id.trim()).filter(Boolean)
  const found: { bus: MapBus; away: number }[] = []
  for (const activity of activities) {
    const at = Date.parse(activity.recordedAtTime)
    if (!Number.isFinite(at) || asOf - at > BODS_STALE_MS) continue
    const route = routes.find((id) => matchBodsLine(activity, id))
    if (!route) continue
    const away = metres(stop, { lat: activity.latitude, lon: activity.longitude })
    if (away > radiusM) continue
    found.push({
      bus: {
        id: activity.vehicleRef,
        route,
        lat: activity.latitude,
        lon: activity.longitude,
        bearingDeg: activity.bearing ?? 0,
        destination: activity.destinationName,
        at,
        stale: asOf - at > BUS_FIX_STALE_MS,
      },
      away,
    })
  }
  return found
    .sort((a, b) => a.away - b.away)
    .slice(0, MAX_MAP_BUSES)
    .map((entry) => entry.bus)
}
