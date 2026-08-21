import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  displayTflAppKey,
  isPlausibleTflAppKey,
  maskUserTflAppKey,
} from "./user-credentials-storage"

describe("isPlausibleTflAppKey", () => {
  it("accepts a typical 32-char hex key", () => {
    assert.deepEqual(isPlausibleTflAppKey("abcdef0123456789abcdef0123456789"), {
      ok: true,
    })
  })

  it("warns on empty", () => {
    const result = isPlausibleTflAppKey("   ")
    assert.equal(result.ok, false)
  })

  it("warns on short keys", () => {
    const result = isPlausibleTflAppKey("short")
    assert.equal(result.ok, false)
    if (!result.ok) {
      assert.match(result.warning, /32/)
    }
  })

  it("warns on non-alphanumeric", () => {
    const result = isPlausibleTflAppKey("abcdef0123456789abcdef01234567!!")
    assert.equal(result.ok, false)
  })
})

describe("maskUserTflAppKey", () => {
  it("shows last four characters", () => {
    assert.equal(
      maskUserTflAppKey("abcdef0123456789abcdef0123456789"),
      "••••6789"
    )
  })
})

describe("displayTflAppKey", () => {
  it("keeps the last four characters visible", () => {
    assert.equal(
      displayTflAppKey("abcdef0123456789abcdef0123456789"),
      `${"•".repeat(28)}6789`
    )
  })
})
