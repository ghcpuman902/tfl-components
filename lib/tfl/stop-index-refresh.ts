import { STOP_INDEX } from "tfl-ts/meta/stops"
import type { StopIndexData } from "tfl-ts/meta/stops"
import {
  BUILD_REQUESTS_PER_MINUTE,
  SERVED_INDEX_KEY,
} from "@/lib/tfl/stop-index-served"

type RedisLike = {
  get: (key: string) => Promise<string | null>
  set: (key: string, value: string) => Promise<unknown>
}

/** Rebuilds the index from TfL (about 20 listing pages plus one call per hub) and stores it. Server only. */
export const refreshServedStopIndex = async (
  redis: RedisLike
): Promise<{ ok: true; busStops: number; requests: number } | { ok: false; error: string }> => {
  const appKey = process.env.TFL_APP_KEY
  if (!appKey) return { ok: false, error: "No TfL key." }
  try {
    const { buildStopIndex, stationSeedsFromIndex } = await import(
      "tfl-ts/meta/stops/build"
    )
    const { data, stats } = await buildStopIndex({
      appKey,
      stations: stationSeedsFromIndex(STOP_INDEX),
      maxRequestsPerMinute: BUILD_REQUESTS_PER_MINUTE,
    })
    // A listing that came back nearly empty must not replace a good copy.
    if (stats.busStops < STOP_INDEX.size - STOP_INDEX.stationCount - 2_000)
      return { ok: false, error: `Only ${stats.busStops} bus stops came back.` }
    await redis.set(SERVED_INDEX_KEY, JSON.stringify(data))
    return { ok: true, busStops: stats.busStops, requests: stats.requests }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message.slice(0, 200) : "Build failed." }
  }
}

export const readServedStopIndex = async (redis: RedisLike): Promise<StopIndexData | null> => {
  const raw = await redis.get(SERVED_INDEX_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as StopIndexData
  } catch {
    return null
  }
}
