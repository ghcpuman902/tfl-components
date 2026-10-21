import assert from "node:assert/strict"
import { afterEach, beforeEach, describe, it } from "node:test"
import {
  BOARD_GLANCE_PIN_STORAGE_KEY,
  readGlancePin,
  writeGlancePin,
} from "./board-glance-pin-storage"

const memoryStorage = () => {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
    removeItem: (key: string) => void values.delete(key),
  }
}

describe("glance pin storage", () => {
  const scope = globalThis as { window?: unknown }
  beforeEach(() => {
    scope.window = { localStorage: memoryStorage() }
  })
  afterEach(() => {
    delete scope.window
  })

  it("keeps one pin per stop and clears it", () => {
    writeGlancePin("940GZZLUOXC", "victoria:southbound")
    writeGlancePin("940GZZLUBST", "jubilee:eastbound")
    assert.equal(readGlancePin("940GZZLUOXC"), "victoria:southbound")
    assert.equal(readGlancePin("940GZZLUBST"), "jubilee:eastbound")
    writeGlancePin("940GZZLUOXC", null)
    assert.equal(readGlancePin("940GZZLUOXC"), null)
  })

  it("ignores a corrupt record", () => {
    const storage = (scope.window as { localStorage: Storage }).localStorage
    storage.setItem(BOARD_GLANCE_PIN_STORAGE_KEY, "{not json")
    assert.equal(readGlancePin("940GZZLUOXC"), null)
    storage.setItem(BOARD_GLANCE_PIN_STORAGE_KEY, JSON.stringify({ a: 1 }))
    assert.equal(readGlancePin("a"), null)
  })

  it("is a no-op without a window", () => {
    delete scope.window
    writeGlancePin("940GZZLUOXC", "central:westbound")
    assert.equal(readGlancePin("940GZZLUOXC"), null)
  })
})
