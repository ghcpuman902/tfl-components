/**
 * Hero headline A/B test: ids, cookies and the pure assignment function.
 *
 * Events (client, `lib/analytics/track.ts` → `trackHeroEvent`), each with the
 * single prop `{ variant: "a" | "b" | "c" }`:
 * - `hero_view`  exposure, once per page view of the homepage
 * - `hero_cta`   click on Make my Board (hero link on phones, room chat link)
 * - `board_made` first Board actually created in the builder
 * Visits with `?hero=a|b|c` send nothing and never touch the cookies.
 */

export const HERO_VARIANT_IDS = ["a", "b", "c"] as const
export type HeroVariantId = (typeof HERO_VARIANT_IDS)[number]

export const HERO_DEFAULT_VARIANT: HeroVariantId = "a"

/** `?hero=a|b|c` forces a variant for QA. Not counted, not sticky. */
export const HERO_OVERRIDE_PARAM = "hero"

/** Static permutation route the proxy rewrites `/` to (`app/hero-ab/[code]`). */
export const HERO_AB_PATH = "/hero-ab"

/** Stable random visitor id. Server-set by the proxy, httpOnly. */
export const HERO_VISITOR_COOKIE = "tfl_hero_vid"
/** Variant the visitor was actually shown. Client-set at `hero_view`, read for `board_made`. */
export const HERO_VARIANT_COOKIE = "tfl_hero"
export const HERO_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

/** What the static page knows: the variant it renders and whether to count it. */
export type HeroExposure = { variant: HeroVariantId; counted: boolean }

export const HERO_EVENT_NAMES = ["hero_view", "hero_cta", "board_made"] as const
export type HeroEventName = (typeof HERO_EVENT_NAMES)[number]

export const parseHeroVariant = (
  raw: string | null | undefined
): HeroVariantId | null =>
  (HERO_VARIANT_IDS as readonly string[]).includes(raw ?? "")
    ? (raw as HeroVariantId)
    : null

const FNV_OFFSET = 2166136261
const FNV_PRIME = 16777619

/** FNV-1a over the id, salted so a new test reshuffles visitors. */
export const heroBucket = (visitorId: string, salt = "hero-v1"): number => {
  let hash = FNV_OFFSET
  for (const character of `${salt}:${visitorId}`) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, FNV_PRIME)
  }
  return (hash >>> 0) % 1000
}

/** Equal thirds. Same visitor id, same variant, every time. */
export const heroVariantForVisitor = (visitorId: string): HeroVariantId =>
  HERO_VARIANT_IDS[
    Math.floor((heroBucket(visitorId) / 1000) * HERO_VARIANT_IDS.length)
  ]!

export const readHeroVariantCookie = (
  cookieHeader: string | null | undefined
): HeroVariantId | null => {
  if (!cookieHeader) return null
  for (const part of cookieHeader.split(";")) {
    const [name, ...value] = part.trim().split("=")
    if (name === HERO_VARIANT_COOKIE) return parseHeroVariant(value.join("="))
  }
  return null
}

export const heroVariantCookieString = (
  variant: HeroVariantId,
  secure: boolean
): string =>
  `${HERO_VARIANT_COOKIE}=${variant}; Max-Age=${HERO_COOKIE_MAX_AGE_SECONDS}; Path=/; SameSite=Lax${secure ? "; Secure" : ""}`
