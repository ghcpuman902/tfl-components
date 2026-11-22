import { TflHttpError, type RealtimePrediction } from "tfl-ts"

const TFL_ORIGIN = "https://api.tfl.gov.uk"
const TIMEOUT_MS = 20_000

/**
 * An arrivals URL TfL's edge cache has never seen: a unique `_` per call skips
 * its 60 s Varnish copy (measured 0–59 s extra age), so we read TfL's own
 * latest. Our shared use-cache entry still means one read per 20 s.
 */
export const freshArrivalsUrl = (
  path: string,
  appKey: string | undefined,
  now: number
): URL => {
  const url = new URL(path, TFL_ORIGIN)
  if (appKey) url.searchParams.set("app_key", appKey)
  url.searchParams.set("_", String(now))
  return url
}

/** GET a TfL arrivals list past TfL's edge cache. Errors carry the status, never the key. */
export const fetchFreshArrivals = async (path: string): Promise<RealtimePrediction[]> => {
  const url = freshArrivalsUrl(path, process.env.TFL_APP_KEY, Date.now())
  const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) })
  if (!response.ok) {
    throw new TflHttpError(
      `TfL API request failed: ${response.status} ${response.statusText}`,
      response.status,
      response.statusText,
      await response.text().catch(() => undefined),
      `${TFL_ORIGIN}${path}`
    )
  }
  return (await response.json()) as RealtimePrediction[]
}
