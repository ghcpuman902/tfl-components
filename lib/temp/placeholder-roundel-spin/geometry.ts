/**
 * Source-of-truth dimensions from the filled placeholder roundel
 * (`PlaceholderRoundelSvg` / `app/icon.svg`), not a new logo.
 *
 * Wikimedia footprint used by `registry/tfl/brand/tfl-roundel.tsx`.
 */
export const PLACEHOLDER_ROUNDEL_SVG = {
  viewWidth: 615.3,
  viewHeight: 500,
  cx: 308.123,
  cy: 249.985,
  outerRadius: 250,
  barY: 199.5,
  barHeight: 101.1,
  barWidth: 615.3,
} as const

export type DerivedPlaceholderRoundel3d = {
  sphereRadius: number
  /** Major radius — centre of the tube circle to the spin axis. */
  ringRadius: number
  /** Tube-circle radius before the sphere bite — half the SVG bar height. */
  ringThickness: number
}

export type RingProfilePoint = { x: number; y: number }

export type RingCrescentProfile = {
  outer: RingProfilePoint[]
  inner: RingProfilePoint[]
}

export const crescentPoints = (
  profile: RingCrescentProfile
): RingProfilePoint[] => [...profile.outer, ...profile.inner]

/** World units the revolved crescent bites into the disc, hiding the kiss hairline. */
export const RING_SPHERE_KISS = 6

/**
 * Smallest `cos(φ)` that stays on or outside the sphere. `φ = 0` is the
 * outer equator of the tube. Below −1 the tube misses the sphere entirely.
 */
export const ringTubePhiCutoff = (
  sphereRadius: number,
  ringRadius: number,
  ringThickness: number
): number => {
  const denom = 2 * ringRadius * ringThickness
  if (denom < 1e-9) return -1
  return (
    (sphereRadius * sphereRadius -
      ringRadius * ringRadius -
      ringThickness * ringThickness) /
    denom
  )
}

/**
 * Meridional profile of the ring: tube circle minus the sphere, ready to
 * revolve around Y. `x` is distance from the spin axis, `y` is height.
 */
export const remainingRingProfile = (
  ringRadius: number,
  ringThickness: number,
  sphereRadius: number,
  samples = 24
): RingCrescentProfile => {
  const cutRadius = Math.max(0, sphereRadius - RING_SPHERE_KISS)
  const cutoff = ringTubePhiCutoff(cutRadius, ringRadius, ringThickness)
  const alpha = Math.acos(Math.min(1, Math.max(-1, cutoff)))
  const count = Math.max(8, Math.round(samples))
  const outer: RingProfilePoint[] = []
  for (let index = 0; index <= count; index += 1) {
    const phi = -alpha + (2 * alpha * index) / count
    outer.push({
      x: ringRadius + ringThickness * Math.cos(phi),
      y: ringThickness * Math.sin(phi),
    })
  }
  if (cutoff <= -1 + 1e-6) return { outer, inner: [] }
  const yStart = outer[count]!.y
  const yEnd = outer[0]!.y
  const inner: RingProfilePoint[] = []
  for (let index = 1; index < count; index += 1) {
    const y = yStart + (yEnd - yStart) * (index / count)
    const chord = cutRadius * cutRadius - y * y
    inner.push({ x: Math.sqrt(Math.max(chord, 0)), y })
  }
  return { outer, inner }
}

/**
 * Project the 2D disc + capsule bar into a sphere + a revolved crescent.
 * The tube circle is bitten by the sphere where they meet, then lathed.
 *
 * Edge-on, the silhouette width is `2 * (ringRadius + ringThickness)`
 * and its height is `2 * ringThickness`, matching the SVG bar.
 */
export const derivePlaceholderRoundel3d = (): DerivedPlaceholderRoundel3d => {
  const ringThickness = PLACEHOLDER_ROUNDEL_SVG.barHeight / 2
  const ringRadius = PLACEHOLDER_ROUNDEL_SVG.barWidth / 2 - ringThickness
  return {
    sphereRadius: PLACEHOLDER_ROUNDEL_SVG.outerRadius,
    ringRadius: Math.round(ringRadius * 100) / 100,
    ringThickness: Math.round(ringThickness * 100) / 100,
  }
}

/** Opaque greys that match icon.svg (`#737373` at 0.35 / 0.85) on white. */
export const PLACEHOLDER_ROUNDEL_COMPOSITED = {
  sphere: "#cecece",
  ring: "#888888",
} as const

/** SVG units per world unit when the renderer frame is `exportSize`. */
export const svgWorldScale = (
  cameraScale: number,
  exportSize: number
): number => {
  const halfWidth =
    PLACEHOLDER_ROUNDEL_SVG.viewWidth / 2 / Math.max(cameraScale, 0.05)
  return exportSize / 2 / halfWidth
}

export const sphereSvgRadius = (
  sphereRadius: number,
  cameraScale: number,
  exportSize: number
): number => sphereRadius * svgWorldScale(cameraScale, exportSize)
