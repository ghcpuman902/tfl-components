import { unusedAxis, type Pose } from "./animation"
import type { PlaceholderRoundelSpinConfig } from "./config"
import {
  remainingRingProfile,
  sphereSvgRadius,
  svgWorldScale,
  type RingCrescentProfile,
  type RingProfilePoint,
} from "./geometry"

export type Vec3 = { x: number; y: number; z: number }
export type Vec2 = { x: number; y: number }

export const RING_CENTERLINE_SAMPLES = 80

const rotateX = (p: Vec3, angle: number): Vec3 => {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  return { x: p.x, y: p.y * c - p.z * s, z: p.y * s + p.z * c }
}

const rotateY = (p: Vec3, angle: number): Vec3 => {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  return { x: p.x * c + p.z * s, y: p.y, z: -p.x * s + p.z * c }
}

const rotateZ = (p: Vec3, angle: number): Vec3 => {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  return { x: p.x * c - p.y * s, y: p.x * s + p.y * c, z: p.z }
}

const rotateEulerXyz = (p: Vec3, x: number, y: number, z: number): Vec3 =>
  rotateZ(rotateY(rotateX(p, x), y), z)

const lerp = (a: Vec3, b: Vec3, t: number): Vec3 => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
  z: a.z + (b.z - a.z) * t,
})

const crossing = (a: Vec3, b: Vec3): Vec3 => {
  const denom = a.z - b.z
  if (Math.abs(denom) < 1e-9) return a
  return lerp(a, b, a.z / denom)
}

export const torusCenterline = (radius: number, samples: number): Vec3[] =>
  Array.from({ length: samples }, (_, index) => {
    const angle = (index / samples) * Math.PI * 2
    return { x: radius * Math.cos(angle), y: radius * Math.sin(angle), z: 0 }
  })

/** Same group order as the Three.js lab: ring X=90°, then tilt Euler, then spin. */
export const applyRoundelPose = (
  point: Vec3,
  pose: Pose,
  config: Pick<PlaceholderRoundelSpinConfig, "tiltAxis" | "spinAxis">
): Vec3 => {
  const afterRing = rotateX(point, Math.PI / 2)
  const tilt = { x: 0, y: 0, z: 0 }
  tilt[config.tiltAxis] = pose.tilt
  tilt[unusedAxis(config.spinAxis, config.tiltAxis)] = pose.wobble
  const afterTilt = rotateEulerXyz(afterRing, tilt.x, tilt.y, tilt.z)
  const spin = { x: 0, y: 0, z: 0 }
  spin[config.spinAxis] = pose.spin
  return rotateEulerXyz(afterTilt, spin.x, spin.y, spin.z)
}

const revolvePoint = (point: RingProfilePoint, theta: number): Vec3 => ({
  x: point.x * Math.cos(theta),
  y: point.x * Math.sin(theta),
  z: point.y,
})

type RingSlice = {
  center: Vec3
  outer: Vec3[]
  inner: Vec3[]
}

const posedSlice = (
  profile: RingCrescentProfile,
  radius: number,
  theta: number,
  pose: Pose,
  config: Pick<PlaceholderRoundelSpinConfig, "tiltAxis" | "spinAxis">
): RingSlice => ({
  center: applyRoundelPose(
    { x: radius * Math.cos(theta), y: radius * Math.sin(theta), z: 0 },
    pose,
    config
  ),
  outer: profile.outer.map((point) =>
    applyRoundelPose(revolvePoint(point, theta), pose, config)
  ),
  inner: profile.inner.map((point) =>
    applyRoundelPose(revolvePoint(point, theta), pose, config)
  ),
})

const lerpSlice = (from: RingSlice, to: RingSlice, t: number): RingSlice => ({
  center: lerp(from.center, to.center, t),
  outer: from.outer.map((point, index) =>
    lerp(point, to.outer[index] ?? point, t)
  ),
  inner: from.inner.map((point, index) =>
    lerp(point, to.inner[index] ?? point, t)
  ),
})

const walkInclusive = <T,>(
  items: readonly T[],
  fromExclusive: number,
  toInclusive: number
): T[] => {
  const count = items.length
  const walked: T[] = []
  let index = (fromExclusive + 1) % count
  walked.push(items[index]!)
  while (index !== toInclusive) {
    index = (index + 1) % count
    walked.push(items[index]!)
  }
  return walked
}

export const splitRingArcs = (
  points: readonly Vec3[]
): { front: Vec3[]; back: Vec3[] } => {
  if (points.length === 0) return { front: [], back: [] }
  const maxAbsZ = points.reduce(
    (max, point) => Math.max(max, Math.abs(point.z)),
    0
  )
  if (maxAbsZ < 1e-6) {
    return { front: [...points, points[0]!], back: [...points, points[0]!] }
  }

  const count = points.length
  const cuts: { index: number; point: Vec3 }[] = []
  for (let index = 0; index < count; index += 1) {
    const current = points[index]!
    const next = points[(index + 1) % count]!
    if ((current.z >= 0) !== (next.z >= 0)) {
      cuts.push({ index, point: crossing(current, next) })
    }
  }
  if (cuts.length < 2) {
    const allFront = points.every((point) => point.z >= 0)
    return allFront
      ? { front: [...points, points[0]!], back: [] }
      : { front: [], back: [...points, points[0]!] }
  }

  const first = cuts[0]!
  const second = cuts[1]!
  const afterFirst = points[(first.index + 1) % count]!
  const firstIsFront = afterFirst.z >= 0
  const firstArc = [
    first.point,
    ...walkInclusive(points, first.index, second.index),
    second.point,
  ]
  const secondArc = [
    second.point,
    ...walkInclusive(points, second.index, first.index),
    first.point,
  ]
  return firstIsFront
    ? { front: firstArc, back: secondArc }
    : { front: secondArc, back: firstArc }
}

const splitRingSlices = (
  slices: readonly RingSlice[]
): { front: RingSlice[]; back: RingSlice[] } => {
  if (slices.length === 0) return { front: [], back: [] }
  const maxAbsZ = slices.reduce(
    (max, slice) => Math.max(max, Math.abs(slice.center.z)),
    0
  )
  if (maxAbsZ < 1e-6) {
    return { front: [...slices], back: [...slices] }
  }

  const count = slices.length
  const cuts: { index: number; slice: RingSlice }[] = []
  for (let index = 0; index < count; index += 1) {
    const current = slices[index]!
    const next = slices[(index + 1) % count]!
    if ((current.center.z >= 0) !== (next.center.z >= 0)) {
      const t =
        current.center.z / (current.center.z - next.center.z || 1e-9)
      cuts.push({ index, slice: lerpSlice(current, next, t) })
    }
  }
  if (cuts.length < 2) {
    const allFront = slices.every((slice) => slice.center.z >= 0)
    return allFront
      ? { front: [...slices], back: [] }
      : { front: [], back: [...slices] }
  }

  const first = cuts[0]!
  const second = cuts[1]!
  const afterFirst = slices[(first.index + 1) % count]!
  const firstIsFront = afterFirst.center.z >= 0
  const firstArc = [
    first.slice,
    ...walkInclusive(slices, first.index, second.index),
    second.slice,
  ]
  const secondArc = [
    second.slice,
    ...walkInclusive(slices, second.index, first.index),
    first.slice,
  ]
  return firstIsFront
    ? { front: firstArc, back: secondArc }
    : { front: secondArc, back: firstArc }
}

export const worldToSvg = (point: Vec3, scale: number): Vec2 => ({
  x: point.x * scale,
  y: -point.y * scale,
})

const hypot2 = (point: Vec2) => Math.hypot(point.x, point.y)

const normalize2 = (point: Vec2): Vec2 => {
  const length = hypot2(point)
  if (length < 1e-9) return { x: 0, y: 0 }
  return { x: point.x / length, y: point.y / length }
}

const extremeAlong = (
  points: readonly Vec2[],
  axis: Vec2,
  pick: "max" | "min"
): Vec2 | null => {
  if (points.length === 0) return null
  let best = points[0]!
  let bestDot = best.x * axis.x + best.y * axis.y
  for (const point of points) {
    const dot = point.x * axis.x + point.y * axis.y
    if (pick === "max" ? dot > bestDot : dot < bestDot) {
      best = point
      bestDot = dot
    }
  }
  return best
}

const projectedCrescent = (slice: RingSlice, scale: number): Vec2[] => [
  ...slice.outer.map((point) => worldToSvg(point, scale)),
  ...slice.inner.map((point) => worldToSvg(point, scale)),
]

/** Body ribbon plus the true z=0 crescents (tube circle minus sphere). */
const sweepCrescent = (
  slices: readonly RingSlice[],
  scale: number
): Vec2[][] => {
  if (slices.length === 0) return []
  const projected = slices.map((slice) => ({
    center: worldToSvg(slice.center, scale),
    points: projectedCrescent(slice, scale),
  }))
  const tops: Vec2[] = []
  const bottoms: Vec2[] = []
  for (let index = 0; index < projected.length; index += 1) {
    const prev = projected[Math.max(0, index - 1)]!.center
    const next = projected[Math.min(projected.length - 1, index + 1)]!.center
    const tangent = normalize2({ x: next.x - prev.x, y: next.y - prev.y })
    const perp =
      hypot2(tangent) < 1e-9 ? { x: 0, y: 1 } : { x: -tangent.y, y: tangent.x }
    const top = extremeAlong(projected[index]!.points, perp, "max")
    const bottom = extremeAlong(projected[index]!.points, perp, "min")
    if (top) tops.push(top)
    if (bottom) bottoms.push(bottom)
  }
  const ribbon = [...tops, ...bottoms.reverse()]
  const startCut = projectedCrescent(slices[0]!, scale)
  const endCut = projectedCrescent(slices[slices.length - 1]!, scale)
  return [ribbon, startCut, endCut].filter((contour) => contour.length >= 4)
}

export const projectRoundelSvg = (
  config: PlaceholderRoundelSpinConfig,
  pose: Pose,
  exportSize: number
) => {
  const scale = svgWorldScale(config.cameraScale, exportSize)
  const profile = remainingRingProfile(
    config.ringRadius,
    config.ringThickness,
    config.sphereRadius
  )
  const slices = Array.from({ length: RING_CENTERLINE_SAMPLES }, (_, index) =>
    posedSlice(
      profile,
      config.ringRadius,
      (index / RING_CENTERLINE_SAMPLES) * Math.PI * 2,
      pose,
      config
    )
  )
  const { front, back } = splitRingSlices(slices)
  return {
    front: sweepCrescent(front, scale),
    back: sweepCrescent(back, scale),
    discRadius: sphereSvgRadius(
      config.sphereRadius,
      config.cameraScale,
      exportSize
    ),
  }
}

export const polylinePath = (points: readonly Vec2[], precision = 1): string => {
  if (points.length === 0) return ""
  const fmt = (value: number) => value.toFixed(precision)
  const [first, ...rest] = points
  return `M${fmt(first!.x)} ${fmt(first!.y)}${rest.map((point) => `L${fmt(point.x)} ${fmt(point.y)}`).join("")}`
}
