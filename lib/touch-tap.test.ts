import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  isTap,
  isTouchPointer,
  needsSyntheticClick,
  TAP_MAX_MS,
  TAP_SLOP_PX,
} from "./touch-tap"

const start = { pointerId: 1, x: 100, y: 200, t: 1000 }

describe("touch tap", () => {
  it("treats touch and pen as taps, not mouse", () => {
    assert.equal(isTouchPointer("touch"), true)
    assert.equal(isTouchPointer("pen"), true)
    assert.equal(isTouchPointer("mouse"), false)
  })

  it("accepts a short press that stays in place", () => {
    assert.equal(isTap(start, { pointerId: 1, x: 104, y: 203, t: 1120 }), true)
  })

  it("rejects a scroll, a long press, another finger, or no start", () => {
    assert.equal(
      isTap(start, { pointerId: 1, x: 100, y: 200 + TAP_SLOP_PX + 1, t: 1100 }),
      false
    )
    assert.equal(
      isTap(start, { pointerId: 1, x: 100, y: 200, t: 1000 + TAP_MAX_MS + 1 }),
      false
    )
    assert.equal(isTap(start, { pointerId: 2, x: 100, y: 200, t: 1100 }), false)
    assert.equal(isTap(null, { pointerId: 1, x: 100, y: 200, t: 1100 }), false)
  })

  it("clicks only when the browser did not", () => {
    assert.equal(needsSyntheticClick(2000, 0), true)
    assert.equal(needsSyntheticClick(2000, 1990), true)
    assert.equal(needsSyntheticClick(2000, 2010), false)
  })
})
