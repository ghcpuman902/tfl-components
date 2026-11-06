import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  BOARD_PANEL_HEIGHTS_LIMIT,
  boardPanelHoldKey,
  parseBoardPanelHeights,
  planBoardPanelHold,
  rememberBoardPanelHeight,
} from "./board-panel-hold"

describe("board panel height hold", () => {
  it("buses above trains: a remembered bus height is held and trains paint", () => {
    const plan = planBoardPanelHold([
      { kind: "bus", pending: true, held: 412 },
      { kind: "rail", pending: true, held: 520 },
      { kind: "status", pending: false, held: 300 },
    ])
    assert.deepEqual(plan, [
      { kind: "bus", minHeight: 412, waiting: false },
      { kind: "rail", minHeight: 520, waiting: false },
      { kind: "status", minHeight: undefined, waiting: false },
    ])
  })

  it("buses above trains on a first visit: trains and status wait for the buses", () => {
    const plan = planBoardPanelHold([
      { kind: "bus", pending: true, held: undefined },
      { kind: "rail", pending: false, held: undefined },
      { kind: "status", pending: false, held: undefined },
    ])
    assert.deepEqual(
      plan.map((panel) => panel.waiting),
      [false, true, true]
    )
  })

  it("once the buses land, nothing waits and nothing is held", () => {
    const plan = planBoardPanelHold([
      { kind: "bus", pending: false, held: undefined },
      { kind: "rail", pending: false, held: 520 },
    ])
    assert.deepEqual(plan, [
      { kind: "bus", minHeight: undefined, waiting: false },
      { kind: "rail", minHeight: undefined, waiting: false },
    ])
  })

  it("trains above buses keep painting in order; a pending train never blocks", () => {
    const plan = planBoardPanelHold([
      { kind: "rail", pending: true, held: undefined },
      { kind: "bus", pending: true, held: undefined },
      { kind: "status", pending: true, held: undefined },
    ])
    assert.deepEqual(
      plan.map((panel) => panel.waiting),
      [false, false, true]
    )
  })

  it("keys by source and width to the nearest 10px", () => {
    assert.equal(boardPanelHoldKey("bus", "490000091G", 350), "bus:490000091G:350")
    assert.equal(boardPanelHoldKey("bus", "490000091G", 354), "bus:490000091G:350")
    assert.notEqual(
      boardPanelHoldKey("bus", "490000091G", 350),
      boardPanelHoldKey("bus", "490000091G", 720)
    )
  })

  it("reads only positive numbers from storage", () => {
    assert.deepEqual(parseBoardPanelHeights(null), {})
    assert.deepEqual(parseBoardPanelHeights([1]), {})
    assert.deepEqual(
      parseBoardPanelHeights({ a: 120.4, b: -1, c: "9", d: Number.NaN }),
      { a: 120 }
    )
  })

  it("remembers a height, skips a no-op and drops the oldest past the limit", () => {
    const one = rememberBoardPanelHeight({}, "bus:x:350", 400.2)
    assert.deepEqual(one, { "bus:x:350": 400 })
    assert.equal(rememberBoardPanelHeight(one, "bus:x:350", 400), one)
    assert.equal(rememberBoardPanelHeight(one, "bus:x:350", 0), one)

    let heights = {}
    for (let index = 0; index < BOARD_PANEL_HEIGHTS_LIMIT + 5; index += 1) {
      heights = rememberBoardPanelHeight(heights, `k${index}`, 100 + index)
    }
    const keys = Object.keys(heights)
    assert.equal(keys.length, BOARD_PANEL_HEIGHTS_LIMIT)
    assert.equal(keys.includes("k0"), false)
    assert.equal(keys.at(-1), `k${BOARD_PANEL_HEIGHTS_LIMIT + 4}`)
  })
})
