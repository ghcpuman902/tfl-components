import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  LANDING_SCROLL_BOOT_SCRIPT,
  LANDING_SPACE_HASH,
  hasLandingSpaceHash,
  landingRoomScrollTop,
  landingUrlWithSpaceHash,
  landingUrlWithoutHash,
} from "./space-hash"

describe("landing space hash", () => {
  it("recognises the space fragment with or without a leading hash", () => {
    assert.equal(hasLandingSpaceHash(LANDING_SPACE_HASH), true)
    assert.equal(hasLandingSpaceHash("space"), true)
    assert.equal(hasLandingSpaceHash("#room"), false)
    assert.equal(hasLandingSpaceHash(""), false)
  })

  it("builds a path that only adds the space fragment", () => {
    assert.equal(landingUrlWithSpaceHash("/"), "/#space")
    assert.equal(landingUrlWithSpaceHash("/", "?ref=nav"), "/?ref=nav#space")
    assert.equal(landingUrlWithoutHash("/", "?ref=nav"), "/?ref=nav")
  })

  it("scrolls the wrapper so its bottom sits on the viewport bottom", () => {
    assert.equal(
      landingRoomScrollTop({
        wrapperTop: 64,
        wrapperHeight: 1600,
        scrollY: 120,
        viewportHeight: 800,
      }),
      984
    )
    assert.equal(
      landingRoomScrollTop({
        wrapperTop: -40,
        wrapperHeight: 400,
        scrollY: 0,
        viewportHeight: 800,
      }),
      0
    )
  })

  it("keeps the boot script tied to the space fragment", () => {
    assert.match(LANDING_SCROLL_BOOT_SCRIPT, /#space/)
    assert.match(LANDING_SCROLL_BOOT_SCRIPT, /scrollTo\(0,0\)/)
  })
})
