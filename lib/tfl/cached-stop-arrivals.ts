import { cacheLife, cacheTag } from "next/cache"
import type { RealtimePrediction } from "tfl-ts"
import {
  getBoardArrivalsStopIdsIndex,
  lookupBoardArrivalsStopIds,
} from "@/lib/tfl/board-arrivals-stop-ids"
import { isTflRateLimitError } from "@/lib/tfl/board-rate-limit"
import { SHARED_TRACK_LINE_SETS } from "@/lib/tfl/board-station-lines"
import { getTflClient } from "@/lib/tfl/client"
import {
  HOME_BUS_STOP,
  HOME_RAIL_STOP,
  HOME_RIVER_STOP,
} from "@/lib/tfl/home-arrivals-stops"
import { LANDING_DEMO_STOP_IDS } from "@/lib/tfl/landing-board"

/**
 * Stop IDs the site key is allowed to poll for docs demos.
 * Keeps the Server Action from becoming an open TfL proxy and
 * bounds the shared-cache key space under traffic spikes.
 */
export const DEMO_STOP_ARRIVALS_IDS = new Set<string>([
  HOME_RAIL_STOP.id,
  HOME_BUS_STOP.id,
  HOME_RIVER_STOP.id,
  ...LANDING_DEMO_STOP_IDS,
  // Shared-track Circle / H&C / Met naptans — Board site-key path.
  ...Object.keys(SHARED_TRACK_LINE_SETS).filter((id) =>
    id.startsWith("940GZZ")
  ),
])

export const isDemoStopArrivalsId = (stopPointId: string): boolean =>
  DEMO_STOP_ARRIVALS_IDS.has(stopPointId.trim())

export type CachedArrivalsState = {
  arrivals: RealtimePrediction[]
  rateLimited: boolean
}

const rateLimitedArrivals = (): CachedArrivalsState => ({
  arrivals: [],
  rateLimited: true,
})

/**
 * Shared cache for arrivals polling.
 * Many concurrent viewers collapse to a few TfL calls per stop per minute.
 * A rate-limit result is cached too, so quota exhaustion does not retry TfL
 * on every board poll.
 */
export async function getCachedStopArrivals(
  stopPointId: string
): Promise<RealtimePrediction[]> {
  const state = await getCachedStopArrivalsState(stopPointId)
  if (state.rateLimited) {
    throw new Error("TfL rate-limited this request.")
  }
  return state.arrivals
}

export async function getCachedStopArrivalsState(
  stopPointId: string
): Promise<CachedArrivalsState> {
  return getCachedStopArrivalsById(stopPointId.trim())
}

/**
 * Inner `"use cache"` so the trimmed id is the only argument — and therefore
 * the cache key. A shared entry across stops would paint the previous station
 * for `cacheLife.stale` (~15s) after the Board URL changes.
 */
async function getCachedStopArrivalsById(
  stopPointId: string
): Promise<CachedArrivalsState> {
  "use cache"
  cacheLife({ stale: 15, revalidate: 20, expire: 60 })
  cacheTag("tfl-stop-arrivals", `tfl-stop-arrivals-${stopPointId}`)

  try {
    const client = getTflClient()
    const stopPointIds = lookupBoardArrivalsStopIds(
      getBoardArrivalsStopIdsIndex(),
      stopPointId
    )
    const arrivals = await client.stopPoint.getArrivals({
      stopPointIds: stopPointIds.length > 0 ? stopPointIds : [stopPointId],
      sortBy: "timeToStation",
    })
    return { arrivals, rateLimited: false }
  } catch (error) {
    if (isTflRateLimitError(error)) return rateLimitedArrivals()
    throw error
  }
}

const lineSetKey = (lineIds: readonly string[]): string =>
  [...new Set(lineIds.map((id) => id.trim()).filter(Boolean))].sort().join(",")

export const DEMO_LINE_ARRIVALS_SETS = new Set<string>(
  Object.values(SHARED_TRACK_LINE_SETS).map((ids) => lineSetKey(ids))
)

export const isDemoLineArrivalsSet = (lineIds: readonly string[]): boolean =>
  DEMO_LINE_ARRIVALS_SETS.has(lineSetKey(lineIds))

/**
 * Network-wide arrivals for a curated shared-track line set.
 * One TfL call: GET /Line/{ids}/Arrivals.
 */
export async function getCachedLineArrivals(
  lineIds: readonly string[]
): Promise<RealtimePrediction[]> {
  const state = await getCachedLineArrivalsByKey(lineSetKey(lineIds))
  if (state.rateLimited) {
    throw new Error("TfL rate-limited this request.")
  }
  return state.arrivals
}

async function getCachedLineArrivalsByKey(
  key: string
): Promise<CachedArrivalsState> {
  "use cache"
  cacheLife({ stale: 15, revalidate: 20, expire: 60 })
  cacheTag("tfl-line-arrivals", `tfl-line-arrivals-${key}`)

  try {
    const client = getTflClient()
    const arrivals = await client.line.getArrivals({
      lineIds: key.split(","),
    })
    return { arrivals, rateLimited: false }
  } catch (error) {
    if (isTflRateLimitError(error)) return rateLimitedArrivals()
    throw error
  }
}
