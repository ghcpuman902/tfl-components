import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  scoreViscosityOnTrace,
  type CentralVehicleTrace,
} from "@/lib/tfl/vehicle-viscosity-tune"

const none = {
  curvatureWeight: 1,
  stationApproachKm: 0,
  stationWeight: 0,
  dwellSec: 0,
}

const dwell = {
  curvatureWeight: 1,
  stationApproachKm: 0.16,
  stationWeight: 1.6,
  dwellSec: 18,
}

describe("scoreViscosityOnTrace", () => {
  it("scores a short Central-shaped trace without throwing", () => {
    const now = 1_700_000_000_000
    const trace: CentralVehicleTrace = {
      lineId: "central",
      intervalMs: 1000,
      startedAt: new Date(now).toISOString(),
      frames: [0, 1, 2, 3, 4].map((offset) => ({
        fetchedAt: now + offset * 1000,
        rows: [
          {
            vehicleId: "001",
            naptanId: "940GZZLULYS",
            timeToStation: Math.max(0, 20 - offset * 4),
            destinationName: "Ealing Broadway",
          },
        ],
      })),
    }
    const open = scoreViscosityOnTrace(trace, none)
    const sticky = scoreViscosityOnTrace(trace, dwell)
    assert.ok(open.samples > 0)
    assert.ok(sticky.samples > 0)
    assert.ok(Number.isFinite(open.meanErrorM))
    assert.ok(Number.isFinite(sticky.meanErrorM))
  })
})
