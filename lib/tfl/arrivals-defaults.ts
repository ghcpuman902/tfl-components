/**
 * Shared arrivals board defaults — pure constants, no React.
 * Consumed by the installable board components and the Board URL codec.
 */

/** Visible arrivals per compass bound. Extra trains page behind hover arrows. */
export const RAIL_ARRIVALS_DEFAULT_PAGE_SIZE = 3;

/** Per-bound prediction cap after ordering. Does not drop later lines. */
export const DEFAULT_MAX_ROWS = 16;
