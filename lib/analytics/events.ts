/**
 * Public analytics event names and allowed properties.
 * Never attach keys, coordinates, raw searches, credentialed URLs, or PII.
 */

export const ANALYTICS_EVENT_NAMES = [
  "landing_exposure",
  "landing_hero_interaction",
  "landing_ipad_activate",
  "landing_zoom_complete",
  "landing_cta_click",
  "landing_example_seen",
  "landing_example_interaction",
  "board_setup_started",
  "board_stage_completed",
  "board_setup_completed",
  "landing_docs_visit",
] as const

export type AnalyticsEventName = (typeof ANALYTICS_EVENT_NAMES)[number]

export type AnalyticsDeviceClass = "mobile" | "desktop"
export type AnalyticsViewportCategory =
  | "narrow"
  | "phone"
  | "tablet"
  | "desktop"
export type AnalyticsReferrerCategory =
  | "direct"
  | "internal"
  | "search"
  | "social"
  | "other"
export type AnalyticsKeyMode = "own" | "shared" | "skipped"
export type AnalyticsLandingVariant = "room" | "simple" | "control"
export type AnalyticsScreenProfile = "small" | "large"
export type AnalyticsBoardStage = 1 | 2 | 3 | 4 | 5

export const ANALYTICS_ALLOWED_KEYS = [
  "experimentVersion",
  "variant",
  "deviceClass",
  "viewportCategory",
  "referrerCategory",
  "qa",
  "excludeFromResults",
  "stage",
  "screenProfile",
  "locationUsed",
  "stopSelected",
  "modesCount",
  "keyMode",
  "time_to_example_interaction_ms",
  "time_to_setup_start_ms",
] as const

export type AnalyticsEventProps = {
  experimentVersion: string
  variant: AnalyticsLandingVariant
  deviceClass: AnalyticsDeviceClass
  viewportCategory: AnalyticsViewportCategory
  referrerCategory: AnalyticsReferrerCategory
  qa?: boolean
  excludeFromResults?: boolean
  stage?: AnalyticsBoardStage
  screenProfile?: AnalyticsScreenProfile
  locationUsed?: boolean
  stopSelected?: boolean
  modesCount?: number
  keyMode?: AnalyticsKeyMode
  time_to_example_interaction_ms?: number
  time_to_setup_start_ms?: number
}

export const isAnalyticsEventName = (
  value: string
): value is AnalyticsEventName =>
  (ANALYTICS_EVENT_NAMES as readonly string[]).includes(value)
