import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { resolveBusLayout } from "./board-bus-layout"

describe("resolveBusLayout", () => {
  it("stacks by default on a phone or portrait board", () => {
    assert.equal(resolveBusLayout(null, false), "stack")
    assert.equal(resolveBusLayout("grid", false), "stack")
  })

  it("uses columns by default on a wide landscape board", () => {
    assert.equal(resolveBusLayout(null, true), "columns")
    assert.equal(resolveBusLayout("grid", true), "columns")
  })

  it("lets ?busLayout=columns|stack override the default", () => {
    assert.equal(resolveBusLayout("columns", false), "columns")
    assert.equal(resolveBusLayout("columns", true), "columns")
    assert.equal(resolveBusLayout("stack", true), "stack")
    assert.equal(resolveBusLayout("stack", false), "stack")
  })
})
