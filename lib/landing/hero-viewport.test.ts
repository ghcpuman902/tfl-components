import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  LANDING_HERO_HEIGHT,
  LANDING_RUNWAY_DESKTOP_HEIGHT,
  LANDING_VIEWPORT_BOOT_SCRIPT,
  LANDING_VIEWPORT_HEIGHT_VAR,
  landingViewportHeightPx,
  shouldRemeasureLandingViewport,
} from "./hero-viewport"

describe("landing hero viewport", () => {
  it("ignores height-only resizes on touch devices (toolbar collapse)", () => {
    assert.equal(
      shouldRemeasureLandingViewport({
        previousWidth: 390,
        nextWidth: 390,
        previousHeight: 664,
        nextHeight: 745,
        touchToolbar: true,
      }),
      false
    )
  })

  it("re-measures on width or orientation change", () => {
    assert.equal(
      shouldRemeasureLandingViewport({
        previousWidth: 390,
        nextWidth: 844,
        previousHeight: 664,
        nextHeight: 340,
        touchToolbar: true,
      }),
      true
    )
  })

  it("follows real window resizes on desktop", () => {
    assert.equal(
      shouldRemeasureLandingViewport({
        previousWidth: 1280,
        nextWidth: 1280,
        previousHeight: 800,
        nextHeight: 700,
        touchToolbar: false,
      }),
      true
    )
  })

  it("never uses a viewport height unit", () => {
    for (const value of [
      LANDING_HERO_HEIGHT,
      LANDING_RUNWAY_DESKTOP_HEIGHT,
      LANDING_VIEWPORT_BOOT_SCRIPT,
    ]) {
      assert.doesNotMatch(value, /\d+(?:d|s|l)?vh\b/)
      assert.doesNotMatch(value, /innerHeight|visualViewport/)
    }
    assert.match(LANDING_HERO_HEIGHT, new RegExp(LANDING_VIEWPORT_HEIGHT_VAR))
    assert.match(LANDING_VIEWPORT_BOOT_SCRIPT, /clientHeight/)
  })

  it("writes whole pixels", () => {
    assert.equal(landingViewportHeightPx(663.6), "664px")
    assert.equal(landingViewportHeightPx(0), "1px")
  })
})
