/**
 * Shared arrivals board defaults — pure constants, no React.
 * Consumed by the installable board components and the Board URL codec.
 */

/** Visible arrivals per compass bound. Extra trains page behind hover arrows. */
export const RAIL_ARRIVALS_DEFAULT_PAGE_SIZE = 3

/**
 * Shared-platform merges use 2× the single-line default. Collapsing three
 * lines into one section at 3 rows can hide a later train on a different
 * member line; 6 keeps mixed destinations visible without showing all 9.
 */
export const RAIL_ARRIVALS_MERGED_PAGE_SIZE_MULTIPLIER = 2

export const RAIL_ARRIVALS_MERGED_PAGE_SIZE =
  RAIL_ARRIVALS_DEFAULT_PAGE_SIZE * RAIL_ARRIVALS_MERGED_PAGE_SIZE_MULTIPLIER

/** Per-bound prediction cap after ordering. Does not drop later lines. */
export const DEFAULT_MAX_ROWS = 16

/** River waits at this length and above show London clock time, not minutes. */
export const RIVER_COUNTDOWN_CLOCK_FROM_SECONDS = 30 * 60
