import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { buildDrawingScene } from "./drawing-graph.ts"
import {
  DEFAULT_LAYOUT_POLICY,
  collapseDrawing,
  layoutDrawing,
  scorePlacement,
  trackPathBetween,
} from "./drawing-layout.ts"
import { drawingVariants } from "./pattern.ts"

const at = (
  placement: Map<string, { pos: number; lane: number }>,
  id: string
) => {
  const point = placement.get(id)
  assert.ok(point, `missing ${id}`)
  return point
}

describe("drawing graph", () => {
  it("splits S after the station on a stem Y, and before the stations on a split Y", () => {
    const stem = buildDrawingScene("y", "stem")!
    assert.equal(
      stem.nodes.filter((node) => node.kind === "anonymous").length,
      1
    )
    assert.equal(stem.nodes.filter((node) => node.kind === "station").length, 1)
    assert.ok(stem.edges.some((edge) => edge.a === "S" && edge.b === "Y"))

    const split = buildDrawingScene("y", "split")!
    assert.equal(
      split.nodes.filter((node) => node.kind === "anonymous").length,
      1
    )
    assert.equal(
      split.nodes.filter((node) => node.kind === "station").length,
      2
    )
    assert.ok(split.edges.some((edge) => edge.kind === "bond"))
    assert.ok(split.edges.some((edge) => edge.a === "Y" && edge.b === "S1"))
  })

  it("builds every tree-shaped building block", () => {
    for (const kind of [
      "through",
      "dual-terminus",
      "y",
      "through-terminus",
      "three-termini",
      "independent-corridors",
    ] as const) {
      for (const variant of drawingVariants(kind)) {
        assert.ok(buildDrawingScene(kind, variant.id), `${kind} ${variant.id}`)
      }
    }
    assert.equal(buildDrawingScene("triangle", "a-left"), null)
  })
})

describe("drawing layout", () => {
  it("keeps a dual-terminus interchange perpendicular to the tracks", () => {
    const scene = buildDrawingScene("dual-terminus", "opposite")!
    const placement = collapseDrawing(scene)
    const a = at(placement, "A")
    const b = at(placement, "B")
    const s1 = at(placement, "S1")
    const s2 = at(placement, "S2")
    assert.equal(s1.pos, s2.pos)
    assert.notEqual(s1.lane, s2.lane)
    assert.equal(a.lane, s1.lane)
    assert.equal(b.lane, s2.lane)
    assert.ok(a.pos < s1.pos)
    assert.ok(b.pos > s2.pos)
    assert.notEqual(a.lane, b.lane)
    assert.equal(scorePlacement(scene, placement), 0)
    assert.equal(layoutDrawing(scene).energy, 0)
  })

  it("rejects an interchange that continues the line of travel", () => {
    const scene = buildDrawingScene("dual-terminus", "opposite")!
    const collinear = new Map([
      ["A", { pos: 0, lane: 0 }],
      ["S1", { pos: 1, lane: 0 }],
      ["S2", { pos: 2, lane: 0 }],
      ["B", { pos: 3, lane: 0 }],
    ])
    assert.equal(
      scorePlacement(scene, collinear, DEFAULT_LAYOUT_POLICY),
      Number.POSITIVE_INFINITY
    )
  })

  it("keeps same-side termini on the start side of a vertical interchange", () => {
    const scene = buildDrawingScene("dual-terminus", "same-side")!
    const placement = collapseDrawing(scene)
    const a = at(placement, "A")
    const b = at(placement, "B")
    const s1 = at(placement, "S1")
    const s2 = at(placement, "S2")
    assert.equal(s1.pos, s2.pos)
    assert.ok(a.pos < s1.pos)
    assert.ok(b.pos < s2.pos)
    assert.notEqual(s1.lane, s2.lane)
    assert.equal(scorePlacement(scene, placement), 0)
  })

  it("fans a stem Y after an unlabelled split, keeping S on the trunk", () => {
    const scene = buildDrawingScene("y", "stem")!
    const placement = collapseDrawing(scene)
    const s = at(placement, "S")
    const y = at(placement, "Y")
    const a = at(placement, "A")
    const b = at(placement, "B")
    const c = at(placement, "C")
    assert.ok(a.pos < s.pos)
    assert.ok(s.pos < y.pos)
    assert.equal(s.lane, y.lane)
    assert.equal(a.lane, s.lane)
    assert.ok(y.pos < b.pos)
    assert.ok(y.pos < c.pos)
    assert.notEqual(b.lane, c.lane)
    assert.equal(b.pos, c.pos)
  })

  it("places split-S copies on the branches, bonded perpendicular to travel", () => {
    const scene = buildDrawingScene("y", "split")!
    const placement = collapseDrawing(scene)
    const y = at(placement, "Y")
    const s1 = at(placement, "S1")
    const s2 = at(placement, "S2")
    assert.ok(y.pos < s1.pos)
    assert.equal(s1.pos, s2.pos)
    assert.notEqual(s1.lane, s2.lane)
    assert.equal(
      scorePlacement(scene, placement) < Number.POSITIVE_INFINITY,
      true
    )
  })

  it("does not treat a walking bond as a through-path", () => {
    const scene = buildDrawingScene("dual-terminus", "opposite")!
    assert.equal(trackPathBetween(scene, "A", "B").size, 0)
    const y = buildDrawingScene("y", "stem")!
    assert.ok(trackPathBetween(y, "A", "B").size > 0)
    assert.equal(trackPathBetween(y, "B", "C").size, 0)
  })

  it("gives every tree-shaped block a finite energy", () => {
    for (const kind of [
      "through",
      "dual-terminus",
      "y",
      "through-terminus",
      "three-termini",
      "independent-corridors",
    ] as const) {
      for (const variant of drawingVariants(kind)) {
        const scene = buildDrawingScene(kind, variant.id)!
        const energy = layoutDrawing(scene).energy
        assert.ok(
          Number.isFinite(energy),
          `${kind} ${variant.id} energy ${energy}`
        )
      }
    }
  })
})
