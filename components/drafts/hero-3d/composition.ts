export type Vec3 = readonly [number, number, number]

export type CameraState = {
  position: Vec3
  target: Vec3
  fov: number
}

/** Viewport-width keys for photographing the same physical set. */
export const CAMERA_STATES = {
  portrait: {
    width: 390,
    position: [-0.18, 1.58, 1.68],
    target: [-0.28, 1.5, 0],
    fov: 40,
  },
  medium: {
    width: 768,
    position: [0.06, 1.4, 2.52],
    target: [-0.04, 1.3, 0],
    fov: 36,
  },
  wide: {
    width: 1440,
    position: [0.22, 1.3, 3.62],
    target: [0.04, 1.18, 0],
    fov: 32,
  },
} as const satisfies Record<string, CameraState & { width: number }>

export const ROOM = {
  wallColor: "#f3ebe0",
  floorColor: "#e4d6c4",
  wallWidth: 5.4,
  wallHeight: 2.85,
  wallThickness: 0.07,
  floorDepth: 2.8,
} as const

export const MEDIA_UNIT = {
  width: 2.42,
  height: 0.48,
  depth: 0.42,
  z: 0.32,
  oak: "#c4a06a",
  body: "#f2eee8",
  topThickness: 0.046,
  plinthHeight: 0.05,
  plinthInset: 0.03,
} as const

export const MAIN_DISPLAY = {
  width: 0.74,
  height: 1.16,
  depth: 0.048,
  x: -0.28,
  y: 1.5,
  z: 0.055,
  bezel: "#161616",
  inset: 0.028,
} as const

export const POSTER = {
  width: 0.36,
  height: 0.5,
  depth: 0.028,
  x: 0.82,
  y: 1.78,
  z: 0.04,
} as const

export const PHOTO = {
  width: 0.26,
  height: 0.2,
  depth: 0.022,
  x: 0.98,
  y: 1.22,
  z: 0.038,
} as const

export const ARTWORK = {
  width: 0.3,
  height: 0.3,
  depth: 0.02,
  x: -1.18,
  y: 1.88,
  z: 0.036,
} as const

export const SUN = {
  azimuth: -38,
  elevation: 42,
  distance: 9.2,
  intensity: 3.35,
  color: "#fff3dd",
  ambientIntensity: 0.42,
  hemisphereSky: "#f6ead6",
  hemisphereGround: "#8a7a68",
  hemisphereIntensity: 0.55,
} as const

export const SHADOW_CASTERS = {
  windowT: 0.3,
  leafT: 0.48,
  windowSize: [2.35, 2.7] as const,
  leafSize: [2.8, 2.15] as const,
} as const

export const ASSETS = {
  plant: "/drafts/hero-3d/plant.png",
  leaves: "/drafts/hero-3d/leaves.png",
  window: "/drafts/hero-3d/window.png",
} as const

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

const lerpVec3 = (a: Vec3, b: Vec3, t: number): Vec3 => [
  lerp(a[0], b[0], t),
  lerp(a[1], b[1], t),
  lerp(a[2], b[2], t),
]

const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = clamp01((x - edge0) / (edge1 - edge0))
  return t * t * (3 - 2 * t)
}

const mixCamera = (a: CameraState, b: CameraState, t: number): CameraState => ({
  position: lerpVec3(a.position, b.position, t),
  target: lerpVec3(a.target, b.target, t),
  fov: lerp(a.fov, b.fov, t),
})

/**
 * Photograph the same set at different crops.
 * Width drives the three named states; a tall aspect biases toward portrait.
 */
export const lerpCamera = (width: number, aspect: number): CameraState => {
  const { portrait, medium, wide } = CAMERA_STATES
  const widthState =
    width <= medium.width
      ? mixCamera(
          portrait,
          medium,
          smoothstep(portrait.width, medium.width, width)
        )
      : mixCamera(medium, wide, smoothstep(medium.width, wide.width, width))

  const portraitBias = 1 - smoothstep(0.62, 1.05, aspect)
  if (portraitBias <= 0.001) return widthState
  return mixCamera(widthState, portrait, portraitBias * 0.55)
}

export const sunPositionFromAngles = (
  azimuthDeg: number,
  elevationDeg: number,
  distance = SUN.distance
): Vec3 => {
  const azimuth = (azimuthDeg * Math.PI) / 180
  const elevation = (elevationDeg * Math.PI) / 180
  const horizontal = Math.cos(elevation) * distance
  return [
    Math.sin(azimuth) * horizontal,
    Math.sin(elevation) * distance,
    Math.cos(azimuth) * horizontal,
  ]
}

export const lerpAlong = (from: Vec3, to: Vec3, t: number): Vec3 =>
  lerpVec3(from, to, t)
