import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { moveChipListItem, sameChipOrder } from "./board-chip-list"

describe("moveChipListItem", () => {
  it("appends a pool chip to the selection", () => {
    const next = moveChipListItem(
      { selected: ["17", "30"], pool: ["73", "n73"] },
      "73",
      "selected"
    )
    assert.deepEqual(next.selected, ["17", "30", "73"])
    assert.deepEqual(next.pool, ["n73"])
  })

  it("inserts at an index and reorders within the selection", () => {
    const next = moveChipListItem(
      { selected: ["17", "30", "73"], pool: [] },
      "73",
      "selected",
      0
    )
    assert.deepEqual(next.selected, ["73", "17", "30"])
  })

  it("returns a chip to the pool", () => {
    const next = moveChipListItem(
      { selected: ["17", "30"], pool: ["73"] },
      "17",
      "pool"
    )
    assert.deepEqual(next.selected, ["30"])
    assert.deepEqual(next.pool, ["73", "17"])
  })

  it("returns the same state when the drop does not change order", () => {
    const state = { selected: ["17", "30"], pool: ["73"] }
    const next = moveChipListItem(state, "17", "selected", 0)
    assert.equal(next, state)
  })
})

describe("sameChipOrder", () => {
  it("compares membership and order", () => {
    assert.equal(sameChipOrder(["17", "30"], ["17", "30"]), true)
    assert.equal(sameChipOrder(["17", "30"], ["30", "17"]), false)
    assert.equal(sameChipOrder(["17"], ["17", "30"]), false)
  })
})
