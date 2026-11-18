import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { parseReorderParam } from "./board-reorder-variant"

describe("reorder param", () => {
  it("picks a or b, ignoring case and spaces", () => {
    assert.equal(parseReorderParam("a"), "a")
    assert.equal(parseReorderParam(" B "), "b")
  })

  it("keeps the current behaviour without a param or with an unknown one", () => {
    assert.equal(parseReorderParam(null), "default")
    assert.equal(parseReorderParam(undefined), "default")
    assert.equal(parseReorderParam(""), "default")
    assert.equal(parseReorderParam("c"), "default")
    assert.equal(parseReorderParam("ab"), "default")
  })
})
