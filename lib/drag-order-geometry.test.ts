import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  clampDrag,
  moveItem,
  shiftFor,
  targetIndexFor,
} from "./drag-order-geometry"

// Trains, Buses, Cycle hire: 56 px rows, Buses taller (open).
const ids = ["trains", "buses", "cycle"]
const heights = [56, 120, 56]
const offsets = [0, 56, 176]

/** Rows sorted by where their middles show mid-drag. */
const shownOrder = (dragged: number, dy: number) => {
  const target = targetIndexFor(offsets, heights, dragged, dy)
  const slide = (at: number) =>
    at === dragged ? dy : shiftFor(at, dragged, target, heights[dragged] ?? 0)
  const middle = (at: number) =>
    (offsets[at] ?? 0) + (heights[at] ?? 0) / 2 + slide(at)
  return ids
    .map((id, at) => ({ id, middle: middle(at) }))
    .sort((a, b) => a.middle - b.middle)
    .map((row) => row.id)
}

describe("drag order geometry", () => {
  it("stays put until the row's middle passes a neighbour's middle", () => {
    assert.equal(targetIndexFor(offsets, heights, 0, 0), 0)
    assert.equal(targetIndexFor(offsets, heights, 0, 80), 0)
    assert.equal(targetIndexFor(offsets, heights, 0, 100), 1)
    assert.equal(targetIndexFor(offsets, heights, 0, 160), 1)
  })

  it("a row held against either end of the list lands at that end", () => {
    assert.equal(targetIndexFor(offsets, heights, 0, 176), 2)
    assert.equal(targetIndexFor(offsets, heights, 2, -176), 0)
  })

  it("lifting the last row to the top lands it first", () => {
    assert.equal(targetIndexFor(offsets, heights, 2, -176), 0)
    assert.equal(targetIndexFor(offsets, heights, 2, -40), 2)
    assert.equal(targetIndexFor(offsets, heights, 2, -100), 1)
  })

  it("the others slide by the lifted row's height to open the gap", () => {
    // Cycle hire (index 2) over the top: Trains and Buses move down.
    assert.equal(shiftFor(0, 2, 0, 56), 56)
    assert.equal(shiftFor(1, 2, 0, 56), 56)
    assert.equal(shiftFor(2, 2, 0, 56), 0)
    // Trains (index 0) to the bottom: the rest move up.
    assert.equal(shiftFor(1, 0, 2, 56), -56)
    assert.equal(shiftFor(2, 0, 2, 56), -56)
    // Nothing moves while the row is still over its own place.
    assert.equal(shiftFor(0, 1, 1, 120), 0)
    assert.equal(shiftFor(2, 1, 1, 120), 0)
  })

  it("what shows mid-drag is the order the drop commits", () => {
    for (const [dragged, dy] of [
      [2, -176],
      [2, -100],
      [0, 160],
      [1, -60],
      [1, 90],
    ] as const) {
      const target = targetIndexFor(offsets, heights, dragged, dy)
      assert.deepEqual(shownOrder(dragged, dy), moveItem(ids, dragged, target))
    }
  })

  it("keeps the lifted row inside the list", () => {
    assert.equal(clampDrag(offsets, heights, 0, -40), 0)
    assert.equal(clampDrag(offsets, heights, 0, 500), 176)
    assert.equal(clampDrag(offsets, heights, 2, -500), -176)
    assert.equal(clampDrag(offsets, heights, 1, 30), 30)
  })

  it("moves one item and leaves the input alone", () => {
    const before = ["a", "b", "c", "d"]
    assert.deepEqual(moveItem(before, 3, 0), ["d", "a", "b", "c"])
    assert.deepEqual(moveItem(before, 0, 2), ["b", "c", "a", "d"])
    assert.deepEqual(moveItem(before, 1, 99), ["a", "c", "d", "b"])
    assert.deepEqual(before, ["a", "b", "c", "d"])
  })
})
