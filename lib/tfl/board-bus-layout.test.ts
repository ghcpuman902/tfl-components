import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { parseBusLayout } from "./board-bus-layout"

describe("parseBusLayout", () => {
  it("stacks by default and on anything it does not know", () => {
    assert.equal(parseBusLayout(null, true), "stack")
    assert.equal(parseBusLayout("stack", true), "stack")
    assert.equal(parseBusLayout("grid", true), "stack")
  })

  it("takes columns from the URL only outside production", () => {
    assert.equal(parseBusLayout("columns", true), "columns")
    assert.equal(parseBusLayout("columns", false), "stack")
  })
})
