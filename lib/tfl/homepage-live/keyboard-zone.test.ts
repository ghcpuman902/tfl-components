import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  estimateKeyboardHeight,
  growKeyboardHeight,
  KEYBOARD_HEIGHT_KEY,
  measureKeyboardHeight,
  readKeyboardHeight,
  writeKeyboardHeight,
} from "@/lib/tfl/homepage-live/keyboard-zone"

const memoryStore = () => {
  const data = new Map<string, string>()
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
  }
}

describe("keyboard zone height", () => {
  it("estimates 42% of the screen before any measurement", () => {
    assert.equal(estimateKeyboardHeight(844), 354)
  })

  it("counts only a gap over 120 px as the keyboard", () => {
    assert.equal(measureKeyboardHeight(844, 508), 336)
    assert.equal(measureKeyboardHeight(844, 760), undefined)
  })

  it("grows when the keyboard is taller and never shrinks", () => {
    assert.equal(growKeyboardHeight(336, 360), 360)
    assert.equal(growKeyboardHeight(360, 300), 360)
    assert.equal(growKeyboardHeight(360, undefined), 360)
  })

  it("caches the measured height under tfl-kb-height", () => {
    const store = memoryStore()
    assert.equal(readKeyboardHeight(store), undefined)
    writeKeyboardHeight(store, 336)
    assert.equal(store.getItem(KEYBOARD_HEIGHT_KEY), "336")
    assert.equal(readKeyboardHeight(store), 336)
  })
})
