/**
 * Offline river Explorer search over the cached pier catalogue.
 * Piers are sparse along the Thames — locate uses a wider radius than rail.
 */

import {
  filterExplorerPoints,
  nearbyExplorerPoints,
} from "@/lib/tfl/explorer-point-search"
import type { ExplorerPoint } from "@/lib/tfl/explorer-point-normalise"

export const RIVER_LOCATE_RADIUS_METERS = 2500
export const RIVER_LOCATE_LIMIT = 25

export const filterExplorerRiverPoints = filterExplorerPoints

export const nearbyExplorerRiverPoints = (
  points: readonly ExplorerPoint[],
  origin: { lat: number; lon: number },
  radiusMeters = RIVER_LOCATE_RADIUS_METERS,
  limit = RIVER_LOCATE_LIMIT
): ExplorerPoint[] => nearbyExplorerPoints(points, origin, radiusMeters, limit)
