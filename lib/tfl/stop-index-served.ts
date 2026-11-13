import type { StopIndexData } from "tfl-ts/meta/stops"

/**
 * The daily-refreshed copy of the stop index.
 *
 * The cron (`/api/cron/tfl-metadata`, 04:15) rebuilds it with the tfl-ts builder
 * and stores the encoded snapshot in Redis; `/api/stop-index` serves it with a
 * CDN cache. The page ships the bundled snapshot and only downloads this copy
 * when the bundle is older than `STALE_AFTER_MS` and the served one is newer.
 */
export const SERVED_INDEX_KEY = "tfl:stop-index:v1"
export const STALE_AFTER_MS = 36 * 60 * 60 * 1000
/** The builder is paced under the 250 calls a minute the site allows itself. */
export const BUILD_REQUESTS_PER_MINUTE = 150

/** Whether the client should fetch the served copy at all. */
export const bundleIsStale = (generatedAt: string, now: number): boolean => {
  const at = Date.parse(generatedAt)
  return !Number.isFinite(at) || now - at > STALE_AFTER_MS
}

/** The served copy wins only when it is strictly newer than what the page already has. */
export const servedIsNewer = (bundled: string, served: string): boolean => {
  const a = Date.parse(bundled)
  const b = Date.parse(served)
  return Number.isFinite(b) && (!Number.isFinite(a) || b > a)
}

export type ServedIndexResult =
  | { ok: true; data: StopIndexData }
  | { ok: false; error: string }
