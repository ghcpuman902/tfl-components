import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { translateTflClientError } from "./tfl-error-translation"

describe("translateTflClientError", () => {
  it("maps 401 / invalid key", () => {
    const error = translateTflClientError(new Error("HTTP 401 Unauthorized"))
    assert.equal(error.kind, "invalid-key")
  })

  it("maps 429 / rate limit", () => {
    const error = translateTflClientError(new Error("429 Too Many Requests"))
    assert.equal(error.kind, "rate-limited")
  })

  it("maps network failures", () => {
    const error = translateTflClientError(new Error("Failed to fetch"))
    assert.equal(error.kind, "network")
  })

  it("redacts secrets from residual unknown messages path", () => {
    const key = "abcdef0123456789abcdef0123456789"
    // Unknown path still returns a fixed message (no raw leak).
    const error = translateTflClientError(
      new Error(`weird failure with ${key}`),
      [key]
    )
    assert.equal(error.kind, "unknown")
    assert.doesNotMatch(error.message, new RegExp(key))
  })
})
