import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { nextPress, pressHoldsPage, type Press, type PressEvent } from "./drag-press"

const run = (start: Press, events: readonly PressEvent[]) =>
  events.reduce(nextPress, start)

const hold = { kind: "timer" } as const
const move = (dx: number, dy: number) => ({ kind: "move", dx, dy }) as const

describe("drag press", () => {
  it("a finger held still arms, then a move drags", () => {
    assert.equal(run("pending", [move(1, 2), hold]), "armed")
    assert.equal(run("pending", [hold, move(0, 30)]), "dragging")
  })

  it("a quick swipe is a scroll: it never arms and never holds the page", () => {
    const swipe = run("pending", [move(0, 40), hold])
    assert.equal(swipe, "released")
    assert.equal(pressHoldsPage(swipe), false)
    assert.equal(pressHoldsPage("pending"), false)
  })

  it("holds the page only once armed", () => {
    assert.equal(pressHoldsPage(run("pending", [hold])), true)
    assert.equal(pressHoldsPage(run("pending", [hold, move(0, 30)])), true)
  })

  it("a mouse grip drags after a small vertical move, not a sideways one", () => {
    assert.equal(run("armed", [move(0, 3)]), "armed")
    assert.equal(run("armed", [move(40, 0)]), "armed")
    assert.equal(run("armed", [move(0, 6)]), "dragging")
  })
})
