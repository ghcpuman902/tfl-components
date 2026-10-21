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
    position: [-0.2, 1.55, 1.58],
    target: [-0.26, 1.46, 0],
    fov: 36,
  },
  medium: {
    width: 768,
    position: [0.04, 1.42, 2.28],
    target: [-0.08, 1.34, 0],
    fov: 35,
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
  intensity: 4.8,
  color: "#ffe9c2",
  ambientIntensity: 0.2,
  hemisphereSky: "#d7e4f4",
  hemisphereGround: "#6a5e52",
  hemisphereIntensity: 0.42,
  // Unshadowed sky fill from implied side windows.
  sideSky: "#c5d6ea",
  sideIntensity: 1.15,
} as const

export const SHADOW_CASTERS = {
  /**
   * Light path along sun → wall:
   * leaf layers (near sun) → window aperture (near wall) → set.
   * Window card is mostly opaque; only interior panes pass light.
   */
  windowT: 0.64,
  windowSize: [4.8, 5.4] as const,
  leafLayers: [
    { seed: 1103, t: 0.42, density: 1.45, size: [3.6, 3.8] as const },
    { seed: 4409, t: 0.5, density: 1.25, size: [3.3, 3.5] as const },
    { seed: 7721, t: 0.56, density: 1.1, size: [3.0, 3.2] as const },
  ],
} as const

export const ASSETS = {
  plant: "/drafts/hero-3d/plant.png",
  /** Grove export. Missing file → volume blockout in `hero-tree.tsx`. */
  tree: "/drafts/hero-3d/tree.glb",
} as const

export type HeroHsl = {
  h: number
  s: number
  l: number
}

/**
 * Indoor tree on the media unit. Grow in The Grove, bake wind in Blender,
 * drop the GLB at `ASSETS.tree`. Website owns colour, roughness, and shadows.
 */
export const TREE = {
  x: -0.88,
  z: MEDIA_UNIT.z + 0.06,
  yaw: 0.32,
  scale: 1,
  height: 0.92,
  bark: { h: 28, s: 0.34, l: 0.27 } satisfies HeroHsl,
  leaf: { h: 96, s: 0.32, l: 0.34 } satisfies HeroHsl,
  barkRoughness: 0.88,
  leafRoughness: 0.7,
  leafAlphaTest: 0.4,
  animationSpeed: 1,
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
