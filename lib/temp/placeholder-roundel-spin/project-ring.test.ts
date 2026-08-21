import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { poseAt } from "./animation"
import { animationInputsFromConfig, DEFAULT_PLACEHOLDER_ROUNDEL_SPIN_CONFIG } from "./config"
import {
  remainingRingProfile,
  RING_SPHERE_KISS,
  ringTubePhiCutoff,
} from "./geometry"
import {
  applyRoundelPose,
  polylinePath,
  projectRoundelSvg,
  splitRingArcs,
  torusCenterline,
} from "./project-ring"

describe("placeholder roundel ring projection", () => {
  const config = DEFAULT_PLACEHOLDER_ROUNDEL_SPIN_CONFIG

  it("keeps the untilted centerline on the world XZ plane", () => {
    const rest = poseAt(0, animationInputsFromConfig(config))
    const points = torusCenterline(257.1, 8).map((point) =>
      applyRoundelPose(point, rest, config)
    )
    for (const point of points) {
      assert.ok(Math.abs(point.y) < 1e-9)
    }
    assert.ok(points.some((point) => point.z > 100))
    assert.ok(points.some((point) => point.z < -100))
  })

  it("splits a closed loop into one front arc and one back arc", () => {
    const loop = [
      { x: 1, y: 0, z: 1 },
      { x: 0, y: 0, z: 1 },
      { x: -1, y: 0, z: 1 },
      { x: -1, y: 0, z: -1 },
      { x: 0, y: 0, z: -1 },
      { x: 1, y: 0, z: -1 },
    ]
    const { front, back } = splitRingArcs(loop)
    assert.ok(front.length >= 3)
    assert.ok(back.length >= 3)
    assert.ok(front.every((point) => point.z >= -1e-9))
    assert.ok(back.every((point) => point.z <= 1e-9))
  })

  it("bites the tube circle with the sphere before revolving", () => {
    const profile = remainingRingProfile(
      config.ringRadius,
      config.ringThickness,
      config.sphereRadius
    )
    const cutRadius = config.sphereRadius - RING_SPHERE_KISS
    const cutoff = ringTubePhiCutoff(
      cutRadius,
      config.ringRadius,
      config.ringThickness
    )
    assert.ok(cutoff > -1 && cutoff < 0)
    const points = [...profile.outer, ...profile.inner]
    for (const point of points) {
      assert.ok(
        point.x * point.x + point.y * point.y >= cutRadius * cutRadius - 1e-6
      )
    }
    const radii = points.map((point) => point.x)
    assert.ok(Math.max(...radii) > config.ringRadius + config.ringThickness - 1)
    assert.ok(Math.min(...radii) > cutRadius - config.ringThickness)
    assert.ok(Math.min(...radii) < config.sphereRadius)
    assert.ok(profile.inner.length >= 4)
  })

  it("sweeps the sphere-cut crescent, not a tube stroke", () => {
    const pose = poseAt(0.4, animationInputsFromConfig(config))
    const projected = projectRoundelSvg(config, pose, 200)
    assert.ok(projected.discRadius > 70)
    assert.ok(projected.front.length >= 1)
    assert.ok(projected.back.length >= 1)
    assert.ok(projected.front.every((contour) => contour.length > 4))
    assert.ok(projected.back.every((contour) => contour.length > 4))
    assert.match(polylinePath(projected.front[0]!), /^M/)
    assert.doesNotMatch(polylinePath(projected.front[0]!), /z/i)
    const rest = projectRoundelSvg(
      config,
      poseAt(0, animationInputsFromConfig(config)),
      200
    )
    const reach = Math.max(
      ...rest.front.flat().map((point) => Math.abs(point.x))
    )
    assert.ok(reach > 85)
  })
})
