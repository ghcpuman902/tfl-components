import { flag } from "flags/next"
import {
  HERO_VARIANT_IDS,
  HERO_VISITOR_COOKIE,
  heroVariantForVisitor,
  type HeroVariantId,
} from "@/lib/landing/hero-experiment"

/**
 * Homepage hero headline test. The proxy (`proxy.ts`) precomputes these two
 * flags, signs them into a code and rewrites `/` to `/hero-ab/<code>`, a
 * statically generated page per permutation. Only flags belong in this
 * module: `/.well-known/vercel/flags` publishes every export.
 */
export const heroVariantFlag = flag<HeroVariantId, { visitorId: string }>({
  key: "hero-variant",
  description:
    "Homepage hero headline and subline. Sticky per visitor id cookie, equal thirds.",
  options: HERO_VARIANT_IDS.map((value) => ({
    value,
    label: `Variant ${value}`,
  })),
  identify: ({ cookies }) => ({
    visitorId: cookies.get(HERO_VISITOR_COOKIE)?.value ?? "anonymous",
  }),
  decide: ({ entities }) =>
    heroVariantForVisitor(entities?.visitorId ?? "anonymous"),
})

/**
 * False for `?hero=` QA visits and crawlers: the page renders but sends no
 * events. A flag so the static permutations are `variant x counted`.
 */
export const heroCountedFlag = flag<boolean>({
  key: "hero-counted",
  description: "Whether this homepage view is sent to analytics.",
  options: [
    { value: true, label: "Counted" },
    { value: false, label: "Not counted" },
  ],
  decide: () => true,
})
