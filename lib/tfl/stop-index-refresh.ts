import { createHash } from "node:crypto"
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

/**
 * Fingerprint of what the index says, not of when it was built: `generatedAt`
 * differs on every build, so it is left out. The builder writes keys in a fixed
 * order, so the JSON text is canonical.
 */
export const stopIndexContentHash = (data: StopIndexData): string =>
  createHash("sha256")
    .update(JSON.stringify({ ...data, generatedAt: "" }))
    .digest("hex")

/**
 * The refresh rule: store the built index only when its content differs from
 * the stored copy. An identical build writes nothing, so the stored
 * `generatedAt` stays put and clients that already hold the index are not
 * pointed at a "newer" copy with nothing new in it (`servedIsNewer` compares
 * `generatedAt`). A stored copy that is missing or unreadable counts as changed.
 */
export const storeStopIndexIfChanged = async (
  redis: RedisLike,
  built: StopIndexData
): Promise<"stored" | "unchanged"> => {
  const held = await readServedStopIndex(redis).catch(() => null)
  if (held && stopIndexContentHash(held) === stopIndexContentHash(built)) return "unchanged"
  await redis.set(SERVED_INDEX_KEY, JSON.stringify(built))
  return "stored"
}

/** Rebuilds the index from TfL (about 20 listing pages plus one call per hub) and stores it if it changed. Server only. */
export const refreshServedStopIndex = async (
  redis: RedisLike
): Promise<
  | { ok: true; changed: boolean; busStops: number; requests: number }
  | { ok: false; error: string }
> => {
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
    const stored = await storeStopIndexIfChanged(redis, data)
    return {
      ok: true,
      changed: stored === "stored",
      busStops: stats.busStops,
      requests: stats.requests,
    }
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
