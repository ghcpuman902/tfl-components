import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { redactSecrets } from "./redact-secrets"

describe("redactSecrets", () => {
  it("replaces each known secret substring", () => {
    const key = "abcdef0123456789abcdef0123456789"
    const url = `https://api.tfl.gov.uk/Line/Mode/tube/Status?app_key=${key}`
    assert.equal(
      redactSecrets(url, [key]),
      "https://api.tfl.gov.uk/Line/Mode/tube/Status?app_key=•••"
    )
  })

  it("ignores empty secrets", () => {
    assert.equal(redactSecrets("hello", ["", "x"]), "hello")
  })
})
