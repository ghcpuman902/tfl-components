import { LINE_STATION_SEQUENCES } from "tfl-ts"
import { cacheLife, cacheTag } from "next/cache"
import { getTflClient } from "@/lib/tfl/client"
import type {
  ExplorerLineDetailsPayload,
  ExplorerLineRoute,
  ExplorerLineSummary,
} from "@/lib/tfl/explorer/common"
import type { ExplorerDirection } from "@/lib/tfl/explorer-url-state"
import { shapeExplorerLineRoute } from "@/lib/tfl/explorer/line-route-shape"
import { getCachedLineStatuses } from "@/lib/tfl/status-data"

const TUBE_RAIL_MODE_IDS = [
  "tube",
  "elizabeth-line",
  "dlr",
  "overground",
  "tram",
] as const

/**
 * Tube & rail line directory from tfl-ts `LINE_STATION_SEQUENCES`.
 * Offline topology — no TfL round-trip.
 */
export const getExplorerTubeRailLines = (): ExplorerLineSummary[] => {
  const lines: ExplorerLineSummary[] = []
  for (const modeId of TUBE_RAIL_MODE_IDS) {
    for (const sequence of Object.values(LINE_STATION_SEQUENCES)) {
      if (sequence.modeName !== modeId) continue
      lines.push({
        id: sequence.lineId,
        name: sequence.lineName,
        modeName: sequence.modeName,
      })
    }
  }
  return lines
}

/**
 * Cached route sequence for a line + direction.
 * Moved from the legacy `/explore/routes` page.
 */
export async function getExplorerLineRoute(
  lineId: string,
  direction: ExplorerDirection
): Promise<ExplorerLineRoute> {
  "use cache"
  cacheLife({ revalidate: 300 })
  cacheTag("tfl-route", `tfl-route-${lineId}-${direction}`)

  const client = getTflClient()
  const [lines, sequence] = await Promise.all([
    client.line.get({ lineIds: [lineId] }),
    client.line.getRouteSequence({ id: lineId, direction }),
  ])

  return shapeExplorerLineRoute(lineId, lines, sequence)
}

/**
 * Cached route sequence + status for a selected line.
 * Call without awaiting from the page and unwrap with `use()` behind Suspense.
 */
export async function getExplorerLineDetails(
  lineId: string,
  direction: ExplorerDirection
): Promise<ExplorerLineDetailsPayload> {
  "use cache"
  cacheLife({ revalidate: 60 })
  cacheTag("tfl-line-details", `tfl-line-details-${lineId}-${direction}`)

  const [route, payload] = await Promise.all([
    getExplorerLineRoute(lineId, direction),
    getCachedLineStatuses([lineId]),
  ])

  return {
    lineId,
    direction,
    route,
    status: payload.data[0] ?? null,
  }
}
