import { generatePermutations, getPrecomputed, serialize } from "flags/next"
import { heroCountedFlag, heroVariantFlag } from "@/flags"
import {
  HERO_DEFAULT_VARIANT,
  HERO_OVERRIDE_PARAM,
  HERO_VISITOR_COOKIE,
  parseHeroVariant,
  type HeroVariantId,
} from "@/lib/landing/hero-experiment"
import { isBotUserAgent } from "@/lib/landing/experiment"

/** Order matters: it is part of the code. Append only. */
export const HERO_PRECOMPUTE_FLAGS = [heroVariantFlag, heroCountedFlag] as const

/**
 * `FLAGS_SECRET` signs the code so URLs cannot be enumerated. It is set in
 * Vercel and `.env.local`. The fallback keeps `next build` working on a
 * machine without it; it is public, so it signs nothing of value, and build
 * and runtime must agree on it.
 */
const FALLBACK_SECRET = "aGVyby1hYi1wdWJsaWMtZmFsbGJhY2stc2VjcmV0LTAwMDA"
export const heroFlagsSecret = (): string =>
  process.env.FLAGS_SECRET || FALLBACK_SECRET

export type HeroAssignment = {
  code: string
  variant: HeroVariantId
  counted: boolean
  /** Cookie to set, when the visitor has none yet. */
  newVisitorId: string | null
}

type RequestLike = {
  headers: Headers
  nextUrl: { searchParams: URLSearchParams }
  cookies: { get: (name: string) => { value: string } | undefined }
}

/**
 * Proxy-side assignment.
 * - `?hero=a|b|c`: forced, not counted, no cookie.
 * - Crawlers: default variant, not counted, no cookie (same page every time).
 * - Everyone else: sticky by visitor id; mint the id on first visit.
 */
export const assignHero = async (
  request: RequestLike
): Promise<HeroAssignment> => {
  const secret = heroFlagsSecret()
  const forced = parseHeroVariant(
    request.nextUrl.searchParams.get(HERO_OVERRIDE_PARAM)
  )
  const bot = isBotUserAgent(request.headers.get("user-agent") ?? "")

  if (forced || bot) {
    const variant = forced ?? HERO_DEFAULT_VARIANT
    return {
      code: await serialize(HERO_PRECOMPUTE_FLAGS, [variant, false], secret),
      variant,
      counted: false,
      newVisitorId: null,
    }
  }

  const existing = request.cookies.get(HERO_VISITOR_COOKIE)?.value
  const visitorId = existing || crypto.randomUUID()
  const variant = await heroVariantFlag.run({
    identify: { visitorId },
    request: request as unknown as Request,
  })
  return {
    code: await serialize(HERO_PRECOMPUTE_FLAGS, [variant, true], secret),
    variant,
    counted: true,
    newVisitorId: existing ? null : visitorId,
  }
}

export const heroStaticCodes = (): Promise<string[]> =>
  generatePermutations(HERO_PRECOMPUTE_FLAGS, null, heroFlagsSecret())

/** Decode a code from the URL. Throws on a forged or stale code. */
export const decodeHeroCode = async (
  code: string
): Promise<{ variant: HeroVariantId; counted: boolean }> => {
  const [variant, counted] = await getPrecomputed(
    HERO_PRECOMPUTE_FLAGS,
    HERO_PRECOMPUTE_FLAGS,
    code,
    heroFlagsSecret()
  )
  return { variant, counted }
}
