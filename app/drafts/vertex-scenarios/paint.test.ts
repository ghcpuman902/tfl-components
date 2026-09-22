import assert from "node:assert/strict"
import { test } from "node:test"
import { labelMaxBesideMarks, stationLabelLayout } from "./paint"

test("station label layout", () => {
  test("wraps a name that overflows one line onto two, with a tight width", () => {
    // Regression for a bug where a hand-tuned "chars × font × 0.52" estimate
    // guessed one line for "Cannon Street", handing it a box just wide
    // enough to read as fitting — while the real (wider) rendered text
    // overflowed past that box into the mark below it.
    const box = stationLabelLayout("Cannon Street", "down", 0, 0)
    assert.equal(box.lines.length, 2)
    assert.deepEqual(box.lines, ["Cannon", "Street"])
    assert.ok(
      box.width < 140,
      `expected a box tighter than labelMaxWidth (140), got ${box.width}`
    )
    assert.equal(box.height, Math.ceil(20 * 1.35 * 2))
  })

  test("wraps Cannon Street when a neighbour ring owns the other half of the run", () => {
    // Live canvas "Cannon Street" is ~134px — under the default 140 cap
    // it stays one line and slides under the interchange. The atoms
    // budget for a 162px run beside a ring is 122, which forces the wrap.
    const maxWidth = labelMaxBesideMarks(80, 118, "down", [
      { x: 242, y: 118, kind: "station" },
    ])
    assert.equal(maxWidth, 122)
    const box = stationLabelLayout("Cannon Street", "down", 80, 118, maxWidth)
    assert.deepEqual(box.lines, ["Cannon", "Street"])
    assert.ok(box.width <= maxWidth)
  })

  test("keeps a short name on one line with a tight, not maxed-out, box", () => {
    const box = stationLabelLayout("Bank", "up", 0, 0)
    assert.equal(box.lines.length, 1)
    assert.ok(box.width < 140)
  })

  test("box sits on the mark side matching `away`", () => {
    const up = stationLabelLayout("Bank", "up", 100, 100)
    const down = stationLabelLayout("Bank", "down", 100, 100)
    // "up" sits above the point (smaller y), "down" sits below it.
    assert.ok(up.y < 100)
    assert.ok(down.y > up.y)
  })
})
