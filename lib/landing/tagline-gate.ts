import { fileURLToPath } from "node:url"
import { loadFontMetrics, type FontMetrics } from "@/lib/landing/font-metrics"
import {
  HERO_CANDIDATES,
  type HeroCandidate,
} from "@/lib/landing/hero-candidates"
import {
  clampPx,
  heroTextWidth,
  HERO_BREAKPOINTS,
  HERO_FONT,
  HERO_HEADLINE_CLAMP,
  HERO_SUBLINE_CLAMP,
  type HeroBreakpointId,
} from "@/lib/landing/hero-type"
import {
  checkText,
  type ShapeRules,
  type TextResult,
} from "@/lib/landing/tagline-shape"

/**
 * Thresholds. Headline is display type read as a unit: the shortest line
 * must be at least half the longest (ratio 2.0). Typographers tolerate a last
 * line down to about a third of the measure in running text, so the subline
 * (small text) allows 3.0. `balancedRatio` 1.25 is where `text-wrap: balance`
 * output typically lands. `fitShare` 0.97 keeps 3% headroom for hinting and
 * font fallback.
 */
const BASE_RULES = {
  maxLines: 3,
  balancedRatio: 1.25,
  equalTolerance: 0.08,
  fitShare: 0.97,
} as const

export const HEADLINE_RULES: Record<HeroBreakpointId, ShapeRules> = {
  sm: { ...BASE_RULES, maxRatio: 2.0, preferredLines: [2, 3] },
  md: { ...BASE_RULES, maxRatio: 2.0, preferredLines: [1, 2] },
  lg: { ...BASE_RULES, maxRatio: 2.0, preferredLines: [1, 2] },
}

export const SUBLINE_RULES: Record<HeroBreakpointId, ShapeRules> = {
  sm: { ...BASE_RULES, maxRatio: 3.0, preferredLines: [2, 3] },
  md: { ...BASE_RULES, maxRatio: 3.0, preferredLines: [1, 2] },
  lg: { ...BASE_RULES, maxRatio: 3.0, preferredLines: [1, 2] },
}

export type BreakpointResult = {
  id: HeroBreakpointId
  viewport: number
  containerPx: number
  headlineFontPx: number
  sublineFontPx: number
  headline: TextResult
  subline: TextResult
  pass: boolean
}

export type CandidateResult = {
  candidate: HeroCandidate
  pass: boolean
  breakpoints: BreakpointResult[]
}

let metrics: FontMetrics | null = null
const heroMetrics = (): FontMetrics => {
  metrics ??= loadFontMetrics(
    fileURLToPath(new URL(`../../${HERO_FONT.file}`, import.meta.url))
  )
  return metrics
}

export const checkCandidate = (
  candidate: HeroCandidate,
  font: FontMetrics = heroMetrics()
): CandidateResult => {
  const breakpoints = HERO_BREAKPOINTS.map(({ id, viewport }) => {
    const containerPx = heroTextWidth(viewport)
    const headlineFontPx = clampPx(HERO_HEADLINE_CLAMP, viewport)
    const sublineFontPx = clampPx(HERO_SUBLINE_CLAMP, viewport)
    const headline = checkText(
      candidate.headline,
      containerPx,
      (text) =>
        font.width(text, headlineFontPx, HERO_FONT.trackingEm * headlineFontPx),
      HEADLINE_RULES[id]
    )
    const subline = checkText(
      candidate.subline,
      containerPx,
      (text) => font.width(text, sublineFontPx),
      SUBLINE_RULES[id]
    )
    return {
      id,
      viewport,
      containerPx,
      headlineFontPx,
      sublineFontPx,
      headline,
      subline,
      pass: headline.pass && subline.pass,
    }
  })
  return {
    candidate,
    pass: breakpoints.every((breakpoint) => breakpoint.pass),
    breakpoints,
  }
}

export const runTaglineGate = (
  candidates: readonly HeroCandidate[] = HERO_CANDIDATES
): CandidateResult[] => candidates.map((candidate) => checkCandidate(candidate))

/** First three passing candidates, in draft order. */
export const experimentCandidates = (results: readonly CandidateResult[]) =>
  results.filter((result) => result.pass).slice(0, 3)
