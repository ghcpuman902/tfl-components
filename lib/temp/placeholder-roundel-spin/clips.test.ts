import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { poseAt } from "./animation"
import {
  clipPlan,
  deriveHoverWindows,
  poseAtClip,
  sampleClipTimes,
  totalClipFrames,
} from "./clips"
import {
  animationInputsFromConfig,
  DEFAULT_PLACEHOLDER_ROUNDEL_SPIN_CONFIG,
} from "./config"

describe("placeholder roundel clips", () => {
  const config = DEFAULT_PLACEHOLDER_ROUNDEL_SPIN_CONFIG
  const inputs = animationInputsFromConfig(config)

  it("keeps intro as rest-to-rest with the locked turn count", () => {
    const start = poseAtClip("intro", 0, inputs)
    const end = poseAtClip("intro", 1, inputs)
    assert.deepEqual(start, poseAt(0, inputs))
    assert.equal(start.tilt, 0)
    assert.equal(end.tilt, 0)
    assert.ok(Math.abs(end.spin - config.turns * Math.PI * 2) < 1e-12)
  })

  it("slices accel, loop, and decel from the default animation", () => {
    const { t0, t1 } = deriveHoverWindows(config)
    const accelEnd = poseAtClip("accel", 1, inputs)
    const loopStart = poseAtClip("loop", 0, inputs)
    const loopMid = poseAtClip("loop", 0.5, inputs)
    const decelStart = poseAtClip("decel", 0, inputs)
    const peak = poseAt(0.5, inputs)
    assert.ok(Math.abs(accelEnd.spin - poseAt(t0, inputs).spin) < 1e-9)
    assert.ok(Math.abs(accelEnd.spin - loopStart.spin) < 1e-9)
    assert.ok(Math.abs(decelStart.spin - poseAt(t1, inputs).spin) < 1e-9)
    assert.ok(Math.abs(loopMid.spin - peak.spin) < 1e-6)
    assert.ok(Math.abs(loopMid.tilt - peak.tilt) < 1e-6)
  })

  it("matches intro peak speed on the hover cruise slice", () => {
    const dt = 1e-5
    const { t0, t1, durationMs } = deriveHoverWindows(config)
    const introPeak =
      (poseAt(0.5 + dt, inputs).spin - poseAt(0.5 - dt, inputs).spin) /
      (2 * dt * durationMs)
    const loopMid =
      (poseAtClip("loop", 0.5 + dt, inputs).spin -
        poseAtClip("loop", 0.5 - dt, inputs).spin) /
      (2 * dt * (t1 - t0) * durationMs)
    assert.ok(Math.abs(loopMid - introPeak) / introPeak < 0.02)

    const accelEnd =
      (poseAtClip("accel", 1, inputs).spin -
        poseAtClip("accel", 1 - dt, inputs).spin) /
      (dt * t0 * durationMs)
    const loopStart =
      (poseAtClip("loop", dt, inputs).spin - poseAtClip("loop", 0, inputs).spin) /
      (dt * (t1 - t0) * durationMs)
    assert.ok(Math.abs(accelEnd - loopStart) / loopStart < 0.02)
  })

  it("samples the loop without duplicating frame 0 at the end", () => {
    assert.deepEqual(sampleClipTimes(4, "cycle"), [0, 0.25, 0.5, 0.75])
    assert.deepEqual(sampleClipTimes(5, "inclusive"), [0, 0.25, 0.5, 0.75, 1])
  })

  it("plans hover clips as ranges into the intro atlas", () => {
    const clips = clipPlan(config)
    const windows = deriveHoverWindows(config)
    assert.deepEqual(
      clips.map((clip) => clip.id),
      ["intro", "accel", "loop", "decel"]
    )
    assert.equal(clips[0]?.frameCount, config.frameCount)
    assert.equal(clips[2]?.loop, true)
    assert.equal(clips[2]?.start, windows.loopStart)
    assert.equal(totalClipFrames(config), config.frameCount)
    assert.ok(clips[2]!.durationMs < 800)
  })

  it("exports SVG on a ±100 unit frame, not the 64px atlas cell", () => {
    assert.equal(config.svgExportSize, 200)
    assert.equal(config.svgPrecision, 1)
    assert.ok(config.svgExportSize > config.frameWidth)
  })

  it("returns decel to rest so unhover can stop", () => {
    const end = poseAtClip("decel", 1, inputs)
    assert.equal(end.tilt, 0)
    assert.equal(end.wobble, 0)
    assert.ok(Math.abs(end.spin - config.turns * Math.PI * 2) < 1e-12)
  })
})
