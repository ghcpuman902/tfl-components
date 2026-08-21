export type SpinProfile = "smootherstep" | "accel-cruise-decel"

export type Axis = "x" | "y" | "z"
export type TiltAxis = Axis
export type SpinAxis = Axis

const AXES: readonly Axis[] = ["x", "y", "z"]

export const unusedAxis = (spinAxis: Axis, tiltAxis: Axis): Axis =>
  AXES.find((axis) => axis !== spinAxis && axis !== tiltAxis) ?? "z"

export type AnimationInputs = {
  turns: number
  maxTiltDeg: number
  tiltAxis: TiltAxis
  spinAxis: SpinAxis
  spinProfile: SpinProfile
  accelFraction: number
  wobbleAmpDeg: number
}

export type Pose = {
  spin: number
  tilt: number
  wobble: number
  envelope: number
  spinProgress: number
}

/** Quintic smootherstep: 6t⁵ − 15t⁴ + 10t³. */
export const smootherstep = (t: number): number => {
  const x = Math.min(1, Math.max(0, t))
  return x * x * x * (x * (x * 6 - 15) + 10)
}

/** Raised bell: sin²(πt). Zero at both endpoints, 1 at t = 0.5. */
export const tiltEnvelope = (t: number): number => {
  const x = Math.min(1, Math.max(0, t))
  if (x === 0 || x === 1) return 0
  const s = Math.sin(Math.PI * x)
  return s * s
}

const smootherstepIntegral = (u: number): number => {
  const x = Math.min(1, Math.max(0, u))
  return x * x * x * x * (x * x - 3 * x + 2.5)
}

/**
 * Piecewise velocity: smootherstep accel → unit cruise → smootherstep decel.
 * Normalised so displacement is exactly 1 at t = 1.
 */
export const accelCruiseDecelProgress = (
  t: number,
  accelFraction = 0.22
): number => {
  const x = Math.min(1, Math.max(0, t))
  const a = Math.min(0.49, Math.max(0.01, accelFraction))
  const total = 1 - a
  if (x <= a) {
    return (a * smootherstepIntegral(x / a)) / total
  }
  if (x >= 1 - a) {
    const w = (1 - x) / a
    return (1 - a - a * smootherstepIntegral(w)) / total
  }
  return (0.5 * a + (x - a)) / total
}

export const spinProgress = (
  t: number,
  profile: SpinProfile,
  accelFraction = 0.22
): number =>
  profile === "accel-cruise-decel"
    ? accelCruiseDecelProgress(t, accelFraction)
    : smootherstep(t)

/** Inverse of `spinProgress`. Binary search is enough — both profiles are monotonic. */
export const invertSpinProgress = (
  progress: number,
  profile: SpinProfile,
  accelFraction = 0.22
): number => {
  const target = Math.min(1, Math.max(0, progress))
  if (target <= 0) return 0
  if (target >= 1) return 1
  let low = 0
  let high = 1
  for (let index = 0; index < 40; index += 1) {
    const mid = (low + high) / 2
    if (spinProgress(mid, profile, accelFraction) < target) low = mid
    else high = mid
  }
  return (low + high) / 2
}

export const poseAt = (t: number, inputs: AnimationInputs): Pose => {
  const x = Math.min(1, Math.max(0, t))
  if (x === 0) {
    return {
      spin: 0,
      tilt: 0,
      wobble: 0,
      envelope: 0,
      spinProgress: 0,
    }
  }
  if (x === 1) {
    return {
      spin: inputs.turns * Math.PI * 2,
      tilt: 0,
      wobble: 0,
      envelope: 0,
      spinProgress: 1,
    }
  }
  const progress = spinProgress(x, inputs.spinProfile, inputs.accelFraction)
  const envelope = tiltEnvelope(x)
  return {
    spin: inputs.turns * Math.PI * 2 * progress,
    tilt: ((inputs.maxTiltDeg * Math.PI) / 180) * envelope,
    wobble: ((inputs.wobbleAmpDeg * Math.PI) / 180) * envelope,
    envelope,
    spinProgress: progress,
  }
}

export const sampleTimes = (frameCount: number): number[] => {
  const count = Math.max(1, Math.round(frameCount))
  if (count === 1) return [0]
  return Array.from({ length: count }, (_, index) => index / (count - 1))
}

export const frameIndexForTime = (t: number, frameCount: number): number => {
  const count = Math.max(1, Math.round(frameCount))
  if (count === 1) return 0
  return Math.round(Math.min(1, Math.max(0, t)) * (count - 1))
}
