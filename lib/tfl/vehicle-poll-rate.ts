export const DEFAULT_TARGET_REQUESTS_PER_MINUTE = "max" as const

export type TargetRequestsPerMinute =
  number | typeof DEFAULT_TARGET_REQUESTS_PER_MINUTE

/** Fastest user-key poll. */
export const MAX_USER_POLL_MS = 4_000
/**
 * Site-key poll. `/api/live-vehicles` is uncached, so each open tab costs the
 * site key 6 TfL requests a minute. TfL's own source times change about every
 * 30-34 s and are often ~45 s old; the client interpolates between polls.
 */
export const SITE_POLL_MS = 10_000
export const MIN_POLL_MS = 4_000
export const MAX_POLL_MS = 60_000

/**
 * Interval for a batched poller. Arrivals for every tracked rail line
 * (or every bus route) share one `getArrivals` call, so line count does
 * not multiply request rate — `requestsPerTick` is 1 per domain.
 */
export const computeBatchedPollIntervalMs = ({
  targetRequestsPerMinute = DEFAULT_TARGET_REQUESTS_PER_MINUTE,
  requestsPerTick = 1,
  minIntervalMs = MIN_POLL_MS,
  maxIntervalMs = MAX_POLL_MS,
}: {
  targetRequestsPerMinute?: TargetRequestsPerMinute
  requestsPerTick?: number
  minIntervalMs?: number
  maxIntervalMs?: number
} = {}): number => {
  if (targetRequestsPerMinute === "max") {
    return Math.min(maxIntervalMs, Math.max(minIntervalMs, MAX_USER_POLL_MS))
  }
  const perMin = Math.max(0.5, targetRequestsPerMinute)
  const ticks = Math.max(1, requestsPerTick)
  const interval = Math.round((60_000 * ticks) / perMin)
  return Math.min(maxIntervalMs, Math.max(minIntervalMs, interval))
}
