export const LANDING_EXPERIMENT_VERSION = "v1"
export const LANDING_EXPERIMENT_KEY = "landing-variant"
/** Disabled until the staged Board ships to production. */
export const LANDING_EXPERIMENT_ENABLED = false
export const LANDING_ASSIGNMENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 30
export const LANDING_OVERRIDE_PARAM = "landing"
export const LANDING_ASSIGNMENT_COOKIE = "tfl_landing"

export type LandingVariant = "room" | "simple"
export type LandingAssignmentVariant = LandingVariant | "control"

export type LandingDeviceClass = "mobile" | "desktop"

export type LandingAssignmentInput = {
  enabled: boolean
  deviceClass: LandingDeviceClass
  visitorId: string
  override: LandingVariant | null
  isPreview: boolean
  isBot: boolean
  persisted: LandingVariant | null
}

export type LandingAssignment = {
  variant: LandingAssignmentVariant
  qa: boolean
  excludeFromResults: boolean
  persist: boolean
}

export const parseLandingVariant = (
  raw: string | null | undefined
): LandingVariant | null => {
  if (raw === "room" || raw === "simple") return raw
  return null
}

const FNV_OFFSET = 2166136261
const hashToBucket = (value: string): number => {
  let hash = FNV_OFFSET
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return Math.abs(hash) % 100
}

export const isBotUserAgent = (userAgent: string): boolean =>
  /bot|crawler|spider|preview|lighthouse|headless|pingdom|slurp|bingpreview/i.test(
    userAgent
  )

export const deviceClassFromWidth = (width: number): LandingDeviceClass =>
  width < 768 ? "mobile" : "desktop"

/**
 * Server-side landing assignment.
 * Mobile always Simple. Desktop is 50/50 only when the experiment is enabled.
 * QA overrides and preview/bot traffic never enter production results.
 */
export const assignLandingVariant = (
  input: LandingAssignmentInput
): LandingAssignment => {
  if (input.override) {
    return {
      variant: input.override,
      qa: true,
      excludeFromResults: true,
      persist: false,
    }
  }

  // Disabled experiment always serves the current homepage, including
  // Vercel previews. Preview/bot exclusion is results-only, not a variant.
  if (!input.enabled) {
    return {
      variant: "control",
      qa: false,
      excludeFromResults: true,
      persist: false,
    }
  }

  if (input.isPreview || input.isBot) {
    return {
      variant: "simple",
      qa: false,
      excludeFromResults: true,
      persist: false,
    }
  }

  if (input.deviceClass === "mobile") {
    return {
      variant: "simple",
      qa: false,
      excludeFromResults: false,
      persist: true,
    }
  }

  const persisted = input.persisted
  if (persisted) {
    return {
      variant: persisted,
      qa: false,
      excludeFromResults: false,
      persist: true,
    }
  }

  const variant: LandingVariant =
    hashToBucket(`${LANDING_EXPERIMENT_VERSION}:${input.visitorId}`) < 50
      ? "room"
      : "simple"

  return {
    variant,
    qa: false,
    excludeFromResults: false,
    persist: true,
  }
}

export const referrerCategoryFromHost = (
  referrerHost: string | null,
  siteHost: string
): "direct" | "internal" | "search" | "social" | "other" => {
  if (!referrerHost) return "direct"
  if (referrerHost === siteHost) return "internal"
  if (
    /google\.|bing\.|duckduckgo\.|yahoo\.|baidu\.|ecosia\./i.test(referrerHost)
  ) {
    return "search"
  }
  if (
    /twitter\.|t\.co$|facebook\.|instagram\.|linkedin\.|reddit\.|youtube\./i.test(
      referrerHost
    )
  ) {
    return "social"
  }
  return "other"
}

export const viewportCategoryFromWidth = (
  width: number
): "narrow" | "phone" | "tablet" | "desktop" => {
  if (width <= 320) return "narrow"
  if (width < 768) return "phone"
  if (width < 1024) return "tablet"
  return "desktop"
}
