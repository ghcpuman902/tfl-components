/**
 * Real hero type and container metrics, shared by `LandingFoldCopy` and the
 * tagline shape checker (`tagline-shape.ts`). `hero-type.test.ts` reads the
 * component and `app/globals.css` and fails if these drift from what ships.
 */

export type HeroBreakpointId = "sm" | "md" | "lg"

/** Viewport widths the gate measures. Tailwind switches: base, `md`, `lg`. */
export const HERO_BREAKPOINTS: readonly {
  id: HeroBreakpointId
  viewport: number
}[] = [
  { id: "sm", viewport: 390 },
  { id: "md", viewport: 768 },
  { id: "lg", viewport: 1440 },
]

type Clamp = { minRem: number; baseRem: number; vw: number; maxRem: number }

/** `text-[clamp(1.25rem,1.05rem+1.1vw,1.75rem)]` on the h1. */
export const HERO_HEADLINE_CLAMP: Clamp = {
  minRem: 1.25,
  baseRem: 1.05,
  vw: 1.1,
  maxRem: 1.75,
}

/** `text-[clamp(0.9375rem,0.85rem+0.45vw,1.125rem)]` on the subline. */
export const HERO_SUBLINE_CLAMP: Clamp = {
  minRem: 0.9375,
  baseRem: 0.85,
  vw: 0.45,
  maxRem: 1.125,
}

export const HERO_HEADLINE_LINE_HEIGHT = 1.15
export const HERO_SUBLINE_LINE_HEIGHT = 1.35

/**
 * Default site face (`next/font` Hammersmith One, weight 400). `:root`
 * sets `--tfl-title-weight: 400` and `--tfl-title-tracking: 0`; the P22
 * Underground profile (Typekit, licensed) overrides them and cannot be
 * measured offline. See the gate report.
 */
export const HERO_FONT = {
  family: "Hammersmith One",
  file: "assets/fonts/hammersmith-one/HammersmithOne-Regular.ttf",
  weight: 400,
  trackingEm: 0,
} as const

/** `max-w-xl` on `.landing-fold-copy`. */
export const HERO_COPY_MAX_WIDTH_PX = 576
/** `px-4` on both sides of `.landing-fold-copy`. */
export const HERO_COPY_PADDING_X_PX = 16

const REM = 16

export const clampPx = (clamp: Clamp, viewport: number): number =>
  Math.min(
    clamp.maxRem * REM,
    Math.max(
      clamp.minRem * REM,
      clamp.baseRem * REM + (clamp.vw / 100) * viewport
    )
  )

/** Text box width inside the fold copy for a viewport width. */
export const heroTextWidth = (viewport: number): number =>
  Math.min(viewport, HERO_COPY_MAX_WIDTH_PX) - HERO_COPY_PADDING_X_PX * 2
