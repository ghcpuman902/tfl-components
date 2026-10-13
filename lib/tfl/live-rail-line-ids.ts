import { LINE_ORDER } from "tfl-ts"

/**
 * Every Tube & Rail line the live-vehicle demo can follow. Same set as the
 * status board (`LINE_ORDER`).
 */
export const LIVE_RAIL_LINE_IDS = LINE_ORDER

/**
 * Shared site-key path: one batched `Line/{ids}/Arrivals` per poll. More than
 * a few lines at once is too much payload for the shared key — visitors who
 * want a wider set add their own TfL key and call TfL from the browser.
 */
export const SITE_MAX_LIVE_RAIL_LINES = 3

export const DEFAULT_LIVE_RAIL_LINE_IDS = ["victoria"] as const
