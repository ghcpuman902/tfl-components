import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  GREATER_LONDON_ISH,
  MINI_MAP_HEIGHT,
  MINI_MAP_WIDTH,
  projectGreaterLondon,
} from "./relation-mini-map"

const METERS_PER_DEG_LAT = 111_320
const REF_LAT = 51.507
const METERS_PER_DEG_LNG =
  METERS_PER_DEG_LAT * Math.cos((REF_LAT * Math.PI) / 180)

describe("relation-mini-map", () => {
  it("uses a 3:2 viewBox", () => {
    assert.equal(MINI_MAP_WIDTH / MINI_MAP_HEIGHT, 1.5)
  })

  it("keeps a kilometre east equal to a kilometre north", () => {
    const origin: [number, number] = [-0.128, 51.508]
    const east: [number, number] = [
      origin[0] + 1000 / METERS_PER_DEG_LNG,
      origin[1],
    ]
    const north: [number, number] = [
      origin[0],
      origin[1] + 1000 / METERS_PER_DEG_LAT,
    ]
    const o = projectGreaterLondon(origin)
    const e = projectGreaterLondon(east)
    const n = projectGreaterLondon(north)
    const eastPx = Math.hypot(e.x - o.x, e.y - o.y)
    const northPx = Math.hypot(n.x - o.x, n.y - o.y)
    assert.ok(Math.abs(eastPx - northPx) / eastPx < 0.02)
  })

  it("places Trafalgar Square inside the Greater London frame", () => {
    const point = projectGreaterLondon([-0.128, 51.508])
    assert.ok(point.x > 0 && point.x < MINI_MAP_WIDTH)
    assert.ok(point.y > 0 && point.y < MINI_MAP_HEIGHT)
    assert.ok(
      GREATER_LONDON_ISH.minLng < -0.128 && GREATER_LONDON_ISH.maxLng > -0.128
    )
  })
})
