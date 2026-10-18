import { HERO_CANDIDATES } from "@/lib/landing/hero-candidates"
import {
  HERO_VARIANT_IDS,
  type HeroVariantId,
} from "@/lib/landing/hero-experiment"
import type { HeroBreakpointId } from "@/lib/landing/hero-type"
import { parseMarkedText, type Chunk } from "@/lib/landing/tagline-shape"

/**
 * The three gate-passing candidates in the A/B test, with the chosen
 * explicit breaks per breakpoint (chunk indices a line break follows).
 * `hero-variants.test.ts` re-runs the gate and fails if these drift from what
 * it chooses, or if a variant stops passing. Regenerate with
 * `node --import tsx scripts/tagline-gate-report.ts`.
 */
export type HeroBreaks = Record<HeroBreakpointId, readonly number[]>

export type HeroVariantCopy = {
  id: HeroVariantId
  headline: readonly Chunk[]
  subline: readonly Chunk[]
  headlineBreaks: HeroBreaks
  sublineBreaks: HeroBreaks
}

const BREAKS: Record<
  HeroVariantId,
  { headline: HeroBreaks; subline: HeroBreaks }
> = {
  a: {
    headline: { sm: [0], md: [0], lg: [0] },
    subline: { sm: [1], md: [], lg: [] },
  },
  b: {
    headline: { sm: [0], md: [], lg: [] },
    subline: { sm: [0, 2], md: [0], lg: [0] },
  },
  c: {
    headline: { sm: [0, 1], md: [1], lg: [1] },
    subline: { sm: [1], md: [], lg: [] },
  },
}

const candidateFor = (id: HeroVariantId) => {
  const candidate = HERO_CANDIDATES.find((entry) => entry.id === id)
  if (!candidate) throw new Error(`No hero candidate "${id}"`)
  return candidate
}

const variantCopy = (id: HeroVariantId): HeroVariantCopy => {
  const candidate = candidateFor(id)
  return {
    id,
    headline: parseMarkedText(candidate.headline),
    subline: parseMarkedText(candidate.subline),
    headlineBreaks: BREAKS[id].headline,
    sublineBreaks: BREAKS[id].subline,
  }
}

export const HERO_VARIANTS: Record<HeroVariantId, HeroVariantCopy> = {
  a: variantCopy("a"),
  b: variantCopy("b"),
  c: variantCopy("c"),
}

const maxLines = (
  pick: (variant: HeroVariantCopy) => HeroBreaks,
  breakpoint: HeroBreakpointId
): number =>
  Math.max(
    ...HERO_VARIANT_IDS.map(
      (id) => pick(HERO_VARIANTS[id])[breakpoint].length + 1
    )
  )

/**
 * Lines to reserve per breakpoint so every variant occupies the same box
 * and the scene below never shifts between variants.
 */
export const HERO_RESERVED_LINES = {
  headline: {
    sm: maxLines((v) => v.headlineBreaks, "sm"),
    md: maxLines((v) => v.headlineBreaks, "md"),
    lg: maxLines((v) => v.headlineBreaks, "lg"),
  },
  subline: {
    sm: maxLines((v) => v.sublineBreaks, "sm"),
    md: maxLines((v) => v.sublineBreaks, "md"),
    lg: maxLines((v) => v.sublineBreaks, "lg"),
  },
} as const

export const heroHeadlineText = (id: HeroVariantId): string =>
  HERO_VARIANTS[id].headline.map((chunk) => chunk.text).join(" ")

export const heroSublineText = (id: HeroVariantId): string =>
  HERO_VARIANTS[id].subline.map((chunk) => chunk.text).join(" ")
