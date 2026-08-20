import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  INTERACTIVE_IDLE_RETURN_MS,
  createIdleReturnState,
  registerIdleActivity,
  resumeIdleReturn,
  shouldReturnToFirstPage,
  suspendIdleReturn,
} from "@/lib/tfl/interactive-idle-return"

describe("shouldReturnToFirstPage", () => {
  it("does not return before the threshold", () => {
    const state = createIdleReturnState(0)
    assert.equal(
      shouldReturnToFirstPage(state, INTERACTIVE_IDLE_RETURN_MS - 1),
      false
    )
  })

  it("returns at and after the threshold", () => {
    const state = createIdleReturnState(0)
    assert.equal(
      shouldReturnToFirstPage(state, INTERACTIVE_IDLE_RETURN_MS),
      true
    )
    assert.equal(
      shouldReturnToFirstPage(state, INTERACTIVE_IDLE_RETURN_MS + 1),
      true
    )
  })

  it("resets the clock when activity is registered", () => {
    const first = createIdleReturnState(0)
    assert.equal(shouldReturnToFirstPage(first, 20_000), false)
    const next = registerIdleActivity(20_000)
    assert.equal(shouldReturnToFirstPage(next, 20_000), false)
    assert.equal(shouldReturnToFirstPage(next, 49_999), false)
    assert.equal(shouldReturnToFirstPage(next, 50_000), true)
  })

  it("never returns while suspended", () => {
    const state = suspendIdleReturn(createIdleReturnState(0))
    assert.equal(
      shouldReturnToFirstPage(state, INTERACTIVE_IDLE_RETURN_MS * 4),
      false
    )
  })

  it("restarts the clock when resumed", () => {
    const suspended = suspendIdleReturn(createIdleReturnState(0))
    const resumed = resumeIdleReturn(suspended, 40_000)
    assert.equal(shouldReturnToFirstPage(resumed, 40_000), false)
    assert.equal(shouldReturnToFirstPage(resumed, 69_999), false)
    assert.equal(shouldReturnToFirstPage(resumed, 70_000), true)
  })

  it("honours a custom idle interval", () => {
    const state = createIdleReturnState(0)
    assert.equal(shouldReturnToFirstPage(state, 4_999, 5_000), false)
    assert.equal(shouldReturnToFirstPage(state, 5_000, 5_000), true)
  })
})
