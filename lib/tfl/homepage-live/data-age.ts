/** Data older than this is shown as stale, with how old it is. */
export const STALE_AFTER_SEC = 90

/** "Updated 40 s ago." under 90 s, "Updated 3 min ago." after. */
export const formatUpdatedAgo = (ageSec: number): string => {
  const sec = Math.max(0, Math.round(ageSec))
  return `Updated ${sec < STALE_AFTER_SEC ? `${sec} s` : `${Math.round(sec / 60)} min`} ago.`
}

export const isStale = (ageSec: number | undefined): boolean =>
  ageSec != null && ageSec > STALE_AFTER_SEC

/** Seconds since a client-clock instant; never negative. */
export const elapsedSec = (sinceMs: number, nowMs: number): number =>
  Math.max(0, Math.round((nowMs - sinceMs) / 1000))

/**
 * Bus rows counted down by the time since they arrived. A row more than a
 * minute past due has gone; the rest never show below zero.
 */
export const countDownRows = <T extends { etaSec: number }>(
  rows: readonly T[],
  elapsed: number
): T[] =>
  rows
    .filter((row) => row.etaSec - elapsed > -60)
    .map((row) => ({ ...row, etaSec: Math.max(0, row.etaSec - elapsed) }))

/**
 * The line under the search. Fresh data says it is live; stale data, or a
 * refresh that failed, keeps the last good snapshot and says how old it is.
 */
export const liveStatusLine = ({
  error,
  ageSec,
}: {
  error?: string
  ageSec?: number
}): string => {
  const age = ageSec != null && (error || isStale(ageSec)) ? formatUpdatedAgo(ageSec) : undefined
  if (error) return age ? `${error} ${age}` : error
  return age ?? "Live from TfL, about a minute behind."
}
