import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  clampPx,
  HERO_HEADLINE_CLAMP,
  heroTextWidth,
} from "@/lib/landing/hero-type"

describe("hero type", () => {
  it("computes the clamp and container widths the gate relies on", () => {
    assert.equal(
      Math.round(clampPx(HERO_HEADLINE_CLAMP, 390) * 100) / 100,
      21.09
    )
    assert.equal(clampPx(HERO_HEADLINE_CLAMP, 200), 20)
    assert.equal(clampPx(HERO_HEADLINE_CLAMP, 1440), 28)
    assert.equal(heroTextWidth(390), 358)
    assert.equal(heroTextWidth(768), 544)
    assert.equal(heroTextWidth(1440), 544)
  })
})
