/** Shared limits and labels for the site feedback flow. */

export const FEEDBACK_TO = "manglekuo@gmail.com"
export const FEEDBACK_FROM = "TfL Components <feedback@mangl.es>"

export const MIN_SUBMIT_MS = 4_000
export const MAX_MESSAGE_CHARS = 4_000
export const MAX_PAGE_TITLE_CHARS = 200
export const MAX_PAGE_URL_CHARS = 2_000
export const MAX_EMAIL_CHARS = 254
export const MAX_SCREENSHOT_BYTES = 1_500_000
export const MAX_BODY_BYTES = 2_000_000

export const ALLOWED_SCREENSHOT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const

export const HONEYPOT_FIELD = "company_website"
export const LOADED_AT_FIELD = "loadedAt"

/** localStorage key for the client-side draft, so a failed submit never
 * loses what someone typed. */
export const DRAFT_STORAGE_KEY = "tfl-feedback-draft"

/** localStorage timestamp of the last successful send — used for a soft
 * "you already sent recently" hint, not a hard block. */
export const LAST_SENT_STORAGE_KEY = "tfl-feedback-last-sent"

/** How long after a successful send to gently suggest they don't need to
 * send again (submit stays enabled). */
export const RECENT_SEND_HINT_SECONDS = 30 * 60

export const GITHUB_REPO = "https://github.com/ghcpuman902/tfl-components"
export const GITHUB_ISSUES_NEW = `${GITHUB_REPO}/issues/new`
export const GITHUB_COMPARE = `${GITHUB_REPO}/compare`

export type FeedbackKind = "bug" | "suggestion"
