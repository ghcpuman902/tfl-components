import { STATION_HUBS } from "tfl-ts"
import type { ExplorerTubeRailPoint } from "@/lib/tfl/explorer/common"

/**
 * Interchange id (`HUBKGX`) → the explorer station that carries its arrivals.
 * The stop index lists an interchange as one row; the Board polls StopPoints.
 * Built on the server, a few hundred short entries.
 */
export const buildHubStationIds = (
  points: readonly ExplorerTubeRailPoint[]
): Record<string, string> => {
  const out: Record<string, string> = {}
  for (const point of points) {
    const hub = STATION_HUBS[point.id]
    if (hub?.hubId && !out[hub.hubId]) out[hub.hubId] = point.id
  }
  return out
}
