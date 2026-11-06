import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  displayTflAppKey,
  isPlausibleTflAppKey,
  maskUserTflAppKey,
  tflKeyDraftChange,
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

describe("tflKeyDraftChange", () => {
  const key = "abcdef0123456789abcdef0123456789"

  it("keeps every character when a key is typed one at a time", () => {
    // The field shows its draft as-is (masked by type="password"), so each
    // keystroke appends to the whole key, not to a masked copy of it.
    let draft = ""
    const actions: string[] = []
    for (const char of key) {
      const change = tflKeyDraftChange(draft + char)
      draft = change.draft
      actions.push(change.action)
    }
    assert.equal(draft, key)
    assert.deepEqual(actions.slice(0, -1), Array(key.length - 1).fill("edit"))
    assert.equal(actions.at(-1), "save")
  })

  it("saves a pasted key, dropping spaces and line breaks", () => {
    assert.deepEqual(
      tflKeyDraftChange(` ${key.slice(0, 16)}\n${key.slice(16)} `),
      {
        draft: key,
        action: "save",
      }
    )
  })

  it("keeps other characters so the field can say the format is wrong", () => {
    assert.deepEqual(tflKeyDraftChange("abc-def"), {
      draft: "abc-def",
      action: "invalid",
    })
  })

  it("clears when emptied", () => {
    assert.deepEqual(tflKeyDraftChange("  "), { draft: "", action: "clear" })
  })
})
