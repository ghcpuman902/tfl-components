import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  deviceClassFromUserAgent,
  deviceClassFromWidth,
  isBotUserAgent,
  referrerCategoryFromHost,
  viewportCategoryFromWidth,
} from "./experiment"

describe("landing analytics helpers", () => {
  it("classifies phones as mobile from the user agent and tablets as desktop", () => {
    assert.equal(
      deviceClassFromUserAgent(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)"
      ),
      "mobile"
    )
    assert.equal(
      deviceClassFromUserAgent(
        "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15"
      ),
      "desktop"
    )
  })

  it("uses 768 as the width breakpoint", () => {
    assert.equal(deviceClassFromWidth(767), "mobile")
    assert.equal(deviceClassFromWidth(768), "desktop")
  })

  it("detects crawlers", () => {
    assert.equal(isBotUserAgent("Googlebot/2.1"), true)
    assert.equal(isBotUserAgent("Mozilla/5.0"), false)
  })

  it("buckets referrers and viewport widths", () => {
    assert.equal(referrerCategoryFromHost(null, "tfl.manglekuo.com"), "direct")
    assert.equal(
      referrerCategoryFromHost("tfl.manglekuo.com", "tfl.manglekuo.com"),
      "internal"
    )
    assert.equal(
      referrerCategoryFromHost("www.google.com", "tfl.manglekuo.com"),
      "search"
    )
    assert.equal(viewportCategoryFromWidth(320), "narrow")
    assert.equal(viewportCategoryFromWidth(390), "phone")
    assert.equal(viewportCategoryFromWidth(800), "tablet")
    assert.equal(viewportCategoryFromWidth(1280), "desktop")
  })
})
