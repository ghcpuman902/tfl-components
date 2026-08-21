import {
  invertSpinProgress,
  poseAt,
  type AnimationInputs,
  type Pose,
  type SpinProfile,
} from "./animation"

export const CLIP_IDS = ["intro", "accel", "loop", "decel"] as const
export type ClipId = (typeof CLIP_IDS)[number]

export type ClipSampleMode = "inclusive" | "cycle"

export type ClipPlanItem = {
  id: ClipId
  start: number
  frameCount: number
  durationMs: number
  loop: boolean
  sample: ClipSampleMode
}

export type ClipTiming = {
  durationMs: number
  frameCount: number
  turns: number
  spinProfile: SpinProfile
  accelFraction: number
}

const clamp01 = (t: number) => Math.min(1, Math.max(0, t))

export type ClipPoseInputs = AnimationInputs & {
  durationMs: number
  frameCount: number
}

export type HoverWindows = {
  t0: number
  t1: number
  loopStart: number
  loopCount: number
  frameCount: number
  durationMs: number
}

/** Inclusive endpoints: t = i / (n - 1). Cycle: t = i / n so the last frame is not a duplicate of 0. */
export const sampleClipTimes = (
  frameCount: number,
  mode: ClipSampleMode
): number[] => {
  const count = Math.max(1, Math.round(frameCount))
  if (mode === "cycle") {
    return Array.from({ length: count }, (_, index) => index / count)
  }
  if (count === 1) return [0]
  return Array.from({ length: count }, (_, index) => index / (count - 1))
}

/**
 * One central turn of the default animation, around peak speed.
 * Needs at least three turns so accel / cruise / decel all exist.
 */
export const deriveHoverWindows = (timing: ClipTiming): HoverWindows => {
  const frameCount = Math.max(4, Math.round(timing.frameCount))
  const durationMs = Math.max(1, timing.durationMs)
  const turns = Math.max(3, timing.turns)
  const halfTurn = 0.5 / turns
  const t0 = invertSpinProgress(
    0.5 - halfTurn,
    timing.spinProfile,
    timing.accelFraction
  )
  const t1 = invertSpinProgress(
    0.5 + halfTurn,
    timing.spinProfile,
    timing.accelFraction
  )
  const last = frameCount - 1
  const loopStart = Math.min(Math.max(1, Math.round(t0 * last)), last - 3)
  const loopEnd = Math.min(Math.max(loopStart + 2, Math.round(t1 * last)), last)
  return {
    t0,
    t1,
    loopStart,
    loopCount: loopEnd - loopStart,
    frameCount,
    durationMs,
  }
}

const lerp = (from: number, to: number, t: number) => from + (to - from) * t

export const poseAtClip = (
  clip: ClipId,
  t: number,
  inputs: ClipPoseInputs
): Pose => {
  if (clip === "intro") return poseAt(t, inputs)
  const { t0, t1 } = deriveHoverWindows(inputs)
  if (clip === "accel") return poseAt(lerp(0, t0, clamp01(t)), inputs)
  if (clip === "loop") return poseAt(lerp(t0, t1, ((t % 1) + 1) % 1), inputs)
  return poseAt(lerp(t1, 1, clamp01(t)), inputs)
}

export const clipPlan = (timing: ClipTiming): ClipPlanItem[] => {
  const windows = deriveHoverWindows(timing)
  const { frameCount, durationMs, t0, t1, loopStart, loopCount } = windows
  return [
    {
      id: "intro",
      start: 0,
      frameCount,
      durationMs,
      loop: false,
      sample: "inclusive",
    },
    {
      id: "accel",
      start: 0,
      frameCount: loopStart + 1,
      durationMs: Math.round(t0 * durationMs),
      loop: false,
      sample: "inclusive",
    },
    {
      id: "loop",
      start: loopStart,
      frameCount: loopCount,
      durationMs: Math.round((t1 - t0) * durationMs),
      loop: true,
      sample: "cycle",
    },
    {
      id: "decel",
      start: loopStart + loopCount,
      frameCount: frameCount - loopStart - loopCount,
      durationMs: Math.round((1 - t1) * durationMs),
      loop: false,
      sample: "inclusive",
    },
  ]
}

export const totalClipFrames = (timing: ClipTiming): number =>
  deriveHoverWindows(timing).frameCount
