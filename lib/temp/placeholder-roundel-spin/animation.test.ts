import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  accelCruiseDecelProgress,
  frameIndexForTime,
  invertSpinProgress,
  poseAt,
  sampleTimes,
  spinProgress,
  smootherstep,
  tiltEnvelope,
} from "./animation"
import { DEFAULT_PLACEHOLDER_ROUNDEL_SPIN_CONFIG } from "./config"

describe("placeholder roundel spin animation", () => {
  it("smootherstep is 0 at rest, 1 at the end, and 0.5 at the midpoint", () => {
    assert.equal(smootherstep(0), 0)
    assert.equal(smootherstep(1), 1)
    assert.equal(smootherstep(0.5), 0.5)
  })

  it("tilt envelope is a raised bell that is exactly zero at both ends", () => {
    assert.equal(tiltEnvelope(0), 0)
    assert.equal(tiltEnvelope(1), 0)
    assert.ok(Math.abs(tiltEnvelope(0.5) - 1) < 1e-12)
    assert.ok(tiltEnvelope(0.25) > 0)
    assert.ok(Math.abs(tiltEnvelope(0.25) - tiltEnvelope(0.75)) < 1e-12)
  })

  it("both spin profiles cover exactly one unit of progress", () => {
    assert.equal(spinProgress(0, "smootherstep"), 0)
    assert.equal(spinProgress(1, "smootherstep"), 1)
    assert.equal(accelCruiseDecelProgress(0), 0)
    assert.equal(accelCruiseDecelProgress(1), 1)
    assert.equal(accelCruiseDecelProgress(1, 0.3), 1)
  })

  it("pose starts and ends at the original orientation for an integer turn count", () => {
    const inputs = {
      turns: 3,
      maxTiltDeg: 32,
      tiltAxis: "x" as const,
      spinAxis: "y" as const,
      spinProfile: "smootherstep" as const,
      accelFraction: 0.22,
      wobbleAmpDeg: 4,
    }
    const start = poseAt(0, inputs)
    const end = poseAt(1, inputs)
    assert.equal(start.spin, 0)
    assert.ok(Math.abs(end.spin - 3 * Math.PI * 2) < 1e-12)
    assert.equal(start.tilt, 0)
    assert.equal(end.tilt, 0)
    assert.equal(start.wobble, 0)
    assert.equal(end.wobble, 0)

    const cruiseEnd = poseAt(1, {
      ...inputs,
      spinProfile: "accel-cruise-decel",
    })
    assert.ok(Math.abs(cruiseEnd.spin - 3 * Math.PI * 2) < 1e-12)
    assert.equal(cruiseEnd.tilt, 0)
  })

  it("defaults the spin axis to vertical Y, not the view axis", () => {
    assert.equal(DEFAULT_PLACEHOLDER_ROUNDEL_SPIN_CONFIG.spinAxis, "y")
  })

  it("inverts spin progress for both profiles", () => {
    for (const profile of ["smootherstep", "accel-cruise-decel"] as const) {
      for (const progress of [0, 0.25, 0.5, 0.75, 1]) {
        const t = invertSpinProgress(progress, profile, 0.14)
        assert.ok(Math.abs(spinProgress(t, profile, 0.14) - progress) < 1e-8)
      }
    }
  })

  it("samples include both endpoints and uses t = i / (n - 1)", () => {
    assert.deepEqual(sampleTimes(1), [0])
    assert.deepEqual(sampleTimes(5), [0, 0.25, 0.5, 0.75, 1])
    assert.equal(frameIndexForTime(0, 32), 0)
    assert.equal(frameIndexForTime(1, 32), 31)
  })
})
