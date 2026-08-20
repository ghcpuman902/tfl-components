import { cacheLife, cacheTag } from "next/cache"
import { getTflClient } from "@/lib/tfl/client"
import type { LondonDay } from "@/lib/tfl/london-dates"
import { getLineSpine, type LineSpine } from "@/lib/tfl/line-spine"
import {
  WEEK_AHEAD_LINE_IDS,
  type LineStatusLike,
  type WeekAheadLineId,
} from "@/lib/tfl/week-ahead-status"

export type WeekAheadLineRoute = LineSpine & {
  lineId: WeekAheadLineId
}

export type WeekAheadLineStatuses = {
  lineId: WeekAheadLineId
  statuses: LineStatusLike[]
}

export type WeekAheadStatusPayload = {
  statusesByLineId: Record<string, LineStatusLike[]>
  statusError?: string
}

export type WeekAheadRoutesPayload = {
  routes: WeekAheadLineRoute[]
}

/**
 * Live detailed status for the displayed date range.
 * Cached ~60s — separate from route geometry.
 */
export async function getCachedWeekAheadStatuses(
  startDate: string,
  endDate: string
): Promise<WeekAheadStatusPayload> {
  "use cache"
  cacheLife({ revalidate: 60 })
  cacheTag("tfl-line-status", "tfl-week-ahead-status")

  const client = getTflClient()
  try {
    const lines = await client.line.getStatus({
      lineIds: [...WEEK_AHEAD_LINE_IDS],
      dateRange: { startDate, endDate },
      detail: true,
    })

    const byId = new Map(
      lines.filter((line) => line.id).map((line) => [line.id!, line] as const)
    )

    const statusesByLineId: Record<string, LineStatusLike[]> = {}
    for (const lineId of WEEK_AHEAD_LINE_IDS) {
      statusesByLineId[lineId] = (byId.get(lineId)?.lineStatuses ??
        []) as LineStatusLike[]
    }

    return { statusesByLineId }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not load live status"
    return { statusesByLineId: {}, statusError: message }
  }
}

export async function getCachedLineRoute(
  lineId: WeekAheadLineId
): Promise<WeekAheadLineRoute> {
  "use cache"
  cacheLife({ revalidate: 3600 })
  cacheTag("tfl-route", `tfl-route-${lineId}-outbound`, "tfl-week-ahead-routes")

  const spine = await getLineSpine(lineId)
  return { ...spine, lineId }
}

/**
 * Route geometry only — long cache, independent of live status.
 * Fetches all lines concurrently.
 */
export async function getCachedWeekAheadRoutes(): Promise<WeekAheadRoutesPayload> {
  "use cache"
  cacheLife({ revalidate: 3600 })
  cacheTag("tfl-route", "tfl-week-ahead-routes")

  const routes = await Promise.all(
    WEEK_AHEAD_LINE_IDS.map((lineId) => getCachedLineRoute(lineId))
  )

  return { routes }
}

export type { LondonDay }
