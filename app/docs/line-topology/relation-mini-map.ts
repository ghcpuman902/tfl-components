import type { LngLat } from "@/lib/tfl/geometry/transit-track-graph"

/** 3:2 thumbnail. Keep in lockstep with the SVG viewBox. */
export const MINI_MAP_WIDTH = 150
export const MINI_MAP_HEIGHT = 100
export const MINI_MAP_PAD = 4

const METERS_PER_DEG_LAT = 111_320
const REF_LAT = 51.507
const METERS_PER_DEG_LNG =
  METERS_PER_DEG_LAT * Math.cos((REF_LAT * Math.PI) / 180)

/**
 * GLA plus short TfL rail tails (Heathrow, Shenfield, Coulsdon, Cockfosters).
 * Projected with a London cosine so east–west is not stretched.
 */
export const GREATER_LONDON_ISH = {
  minLng: -0.51,
  maxLng: 0.33,
  minLat: 51.32,
  maxLat: 51.7,
} as const

const worldWidth =
  (GREATER_LONDON_ISH.maxLng - GREATER_LONDON_ISH.minLng) * METERS_PER_DEG_LNG
const worldHeight =
  (GREATER_LONDON_ISH.maxLat - GREATER_LONDON_ISH.minLat) * METERS_PER_DEG_LAT
const innerWidth = MINI_MAP_WIDTH - MINI_MAP_PAD * 2
const innerHeight = MINI_MAP_HEIGHT - MINI_MAP_PAD * 2
const scale = Math.min(innerWidth / worldWidth, innerHeight / worldHeight)
const offsetX = MINI_MAP_PAD + (innerWidth - worldWidth * scale) / 2
const offsetY = MINI_MAP_PAD + (innerHeight - worldHeight * scale) / 2

export const projectGreaterLondon = (
  point: LngLat
): { x: number; y: number } => ({
  x:
    offsetX +
    (point[0] - GREATER_LONDON_ISH.minLng) * METERS_PER_DEG_LNG * scale,
  y:
    offsetY +
    (GREATER_LONDON_ISH.maxLat - point[1]) * METERS_PER_DEG_LAT * scale,
})

export const miniPath = (path: readonly LngLat[]): string =>
  path
    .map((point, index) => {
      const { x, y } = projectGreaterLondon(point)
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(" ")
