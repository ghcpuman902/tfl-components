import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  DEFAULT_VEHICLE_VISCOSITY,
  stationProximity,
  stillDwelling,
  viscosityFactor,
  viscousDrainKm,
} from "@/lib/tfl/vehicle-viscosity"

describe("stationProximity", () => {
  it("is 0 in open track and 1 at the stop", () => {
    assert.equal(stationProximity(0.4, 0.16), 0)
    assert.equal(stationProximity(0, 0.16), 1)
    assert.ok(stationProximity(0.08, 0.16) > 0.4)
  })
})

describe("viscosityFactor", () => {
  it("matches curvature-only when far from a station", () => {
    const open = viscosityFactor({
      remainingKm: 2,
      turnRadians: 0,
      params: DEFAULT_VEHICLE_VISCOSITY,
    })
    const bent = viscosityFactor({
      remainingKm: 2,
      turnRadians: Math.PI,
      params: DEFAULT_VEHICLE_VISCOSITY,
    })
    assert.equal(open, 1)
    assert.ok(bent > open)
  })

  it("rises at the station even on a straight hop", () => {
    const atStop = viscosityFactor({
      remainingKm: 0,
      turnRadians: 0,
      params: DEFAULT_VEHICLE_VISCOSITY,
    })
    assert.ok(atStop > 2)
  })
})

describe("viscousDrainKm", () => {
  it("drains slower near the station than in open track", () => {
    const open = viscousDrainKm({
      remainingKm: 1,
      elapsedSec: 4,
      speedMetersPerSec: 8.5,
      params: DEFAULT_VEHICLE_VISCOSITY,
    })
    const near = viscousDrainKm({
      remainingKm: 0.05,
      elapsedSec: 4,
      speedMetersPerSec: 8.5,
      params: DEFAULT_VEHICLE_VISCOSITY,
    })
    assert.ok(1 - open.remainingKm > 0.05 - near.remainingKm)
    const held = viscousDrainKm({
      remainingKm: 0,
      elapsedSec: 4,
      speedMetersPerSec: 8.5,
      params: DEFAULT_VEHICLE_VISCOSITY,
    })
    assert.equal(held.remainingKm, 0)
    assert.equal(held.held, true)
  })
})

describe("stillDwelling", () => {
  it("holds for dwellSec after arrival", () => {
    assert.equal(
      stillDwelling(1_000, 1_000 + 5_000, {
        ...DEFAULT_VEHICLE_VISCOSITY,
        dwellSec: 18,
      }),
      true
    )
    assert.equal(
      stillDwelling(1_000, 1_000 + 20_000, {
        ...DEFAULT_VEHICLE_VISCOSITY,
        dwellSec: 18,
      }),
      false
    )
    assert.equal(
      stillDwelling(undefined, 1_000, DEFAULT_VEHICLE_VISCOSITY),
      false
    )
  })
})
