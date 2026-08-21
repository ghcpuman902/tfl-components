/**
 * Offline Tube & rail Explorer search over the cached station catalogue.
 * Name matches outrank ids, then serving lines, then modes. Typing is search.
 */

import {
  EXPLORER_LOCATE_LIMIT,
  EXPLORER_LOCATE_RADIUS_METERS,
  filterExplorerPoints,
  nearbyExplorerPoints,
} from "@/lib/tfl/explorer-point-search"

export const TUBE_RAIL_LOCATE_RADIUS_METERS = EXPLORER_LOCATE_RADIUS_METERS
export const TUBE_RAIL_LOCATE_LIMIT = EXPLORER_LOCATE_LIMIT

export const filterExplorerTubeRailPoints = filterExplorerPoints

export const nearbyExplorerTubeRailPoints = nearbyExplorerPoints
