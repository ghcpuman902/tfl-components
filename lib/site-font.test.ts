import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  isHammersmithStoredPref,
  resolveFontPreference,
} from "./site-font"

describe("resolveFontPreference", () => {
  it("defaults to P22 when an Adobe kit is configured and nothing is stored", () => {
    assert.equal(resolveFontPreference(null, true), "p22")
    assert.equal(resolveFontPreference("p22", true), "p22")
  })

  it("keeps an explicit Hammersmith choice, including the legacy default key", () => {
    assert.equal(resolveFontPreference("hammersmith", true), "hammersmith")
    assert.equal(resolveFontPreference("default", true), "hammersmith")
    assert.equal(isHammersmithStoredPref("default"), true)
  })

  it("falls back to Hammersmith when no Adobe kit is configured", () => {
    assert.equal(resolveFontPreference(null, false), "hammersmith")
    assert.equal(resolveFontPreference("p22", false), "hammersmith")
  })
})
