import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { elapsedSinceExposureMs, recordLandingExposure } from "./timing"

describe("landing exposure timing", () => {
  it("returns elapsed ms from the current exposure and ignores stale sessions", () => {
    const store = new Map<string, string>()
    const sessionStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value)
      },
    }
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { sessionStorage },
    })

    recordLandingExposure(1_000)
    assert.equal(elapsedSinceExposureMs(2 * 60 * 60 * 1000, 1_250), 250)
    assert.equal(elapsedSinceExposureMs(100, 1_250), undefined)

    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: undefined,
    })
  })
})
