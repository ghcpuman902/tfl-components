import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { LINE_DIAGRAM } from "@/lib/tfl/line-diagram"
import {
  spreadDiscs,
  stationMarkerGeometry,
  type Disc,
  type Obstacle,
} from "@/lib/tfl/map-marker-geometry"

const placed = (discs: readonly Disc[], offsets: ReturnType<typeof spreadDiscs>) =>
  discs.map((disc) => {
    const o = offsets.get(disc.id)!
    return { ...disc, x: disc.x + o.dx, y: disc.y + o.dy }
  })

const clearOf = (a: Disc, b: Disc, gap: number) =>
  Math.hypot(a.x - b.x, a.y - b.y) >= a.r + b.r + gap - 0.01

describe("station marker", () => {
  it("keeps the interchange ring at one sixth of the circle at any label size", () => {
    for (const px of [10, 12, 14, 20]) {
      const g = stationMarkerGeometry(px)
      assert.equal(g.ring / (g.outerRadius * 2), LINE_DIAGRAM.interchange.stroke / LINE_DIAGRAM.interchange.outerDiameter)
      assert.equal(g.outerRadius * 2, 3 * g.x)
      assert.equal(g.circleRadius + g.ring, g.outerRadius)
    }
  })

  it("grows with the label's x-height", () => {
    assert.ok(stationMarkerGeometry(14).outerRadius > stationMarkerGeometry(12).outerRadius)
  })
})

describe("marker spreading", () => {
  it("fans out stops that sit on the same spot until none overlap", () => {
    const discs: Disc[] = ["BA", "BB", "BC", "BD", "Z"].map((id) => ({ id, x: 100, y: 100, r: 8 }))
    const out = placed(discs, spreadDiscs(discs))
    for (let i = 0; i < out.length; i++)
      for (let j = i + 1; j < out.length; j++) assert.ok(clearOf(out[i]!, out[j]!, 2), `${out[i]!.id}/${out[j]!.id}`)
  })

  it("moves stops clear of a station circle and its label", () => {
    const discs: Disc[] = [
      { id: "BC", x: 52, y: 50, r: 8 },
      { id: "BD", x: 70, y: 66, r: 8 },
    ]
    const obstacles: Obstacle[] = [
      { kind: "circle", x: 50, y: 50, r: 9 },
      { kind: "rect", left: 20, top: 61, right: 120, bottom: 75 },
    ]
    const out = placed(discs, spreadDiscs(discs, obstacles))
    for (const disc of out) {
      assert.ok(Math.hypot(disc.x - 50, disc.y - 50) >= 9 + disc.r + 2 - 0.01, disc.id)
      const cx = Math.min(Math.max(disc.x, 20), 120)
      const cy = Math.min(Math.max(disc.y, 61), 75)
      assert.ok(Math.hypot(disc.x - cx, disc.y - cy) >= disc.r + 2 - 0.01, disc.id)
    }
  })

  it("leaves stops that are already apart where they are", () => {
    const discs: Disc[] = [
      { id: "A", x: 0, y: 0, r: 8 },
      { id: "B", x: 40, y: 0, r: 8 },
    ]
    for (const offset of spreadDiscs(discs).values()) assert.deepEqual(offset, { dx: 0, dy: 0 })
  })

  it("keeps a small cluster close to where it was", () => {
    const discs: Disc[] = ["A", "B", "C"].map((id, i) => ({ id, x: 100 + i, y: 100, r: 8 }))
    for (const { dx, dy } of spreadDiscs(discs).values()) assert.ok(Math.hypot(dx, dy) < 24)
  })
})
