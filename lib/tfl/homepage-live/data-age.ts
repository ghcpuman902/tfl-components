/** Data older than this is shown dimmed. */
export const STALE_AFTER_SEC = 90

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
