import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  CYCLE_HIRE_MAP_ATTRIBUTION_FALLBACK_PX,
  CYCLE_HIRE_MAP_EDGE_BREATHING_PX,
  clampCycleHireFitPadding,
  cycleHireFitPadding,
  estimateCycleHirePinExtent,
  resolveCycleHireLabelSides,
} from "@/components/tfl/cycle-hire/cycle-hire-map-camera"

describe("cycleHireFitPadding", () => {
  it("pads half the pin on top and pin + label + attribution below", () => {
    const markerSize = 48
    const { above, below, halfWidth } = estimateCycleHirePinExtent(markerSize)
    const padding = cycleHireFitPadding(markerSize, { showNavigation: true })

    assert.equal(padding.top, CYCLE_HIRE_MAP_EDGE_BREATHING_PX + above)
    assert.equal(
      padding.bottom,
      CYCLE_HIRE_MAP_EDGE_BREATHING_PX +
        below +
        CYCLE_HIRE_MAP_ATTRIBUTION_FALLBACK_PX
    )
    assert.ok(padding.bottom > padding.top)
    assert.ok(padding.right > padding.left)
    assert.ok(padding.left >= halfWidth)
  })

  it("grows top padding when labels may flip up", () => {
    const belowOnly = cycleHireFitPadding(48, { labelClearance: "below" })
    const both = cycleHireFitPadding(48, { labelClearance: "both" })
    assert.ok(both.top > belowOnly.top)
    assert.equal(both.bottom, belowOnly.bottom)
  })

  it("uses measured pin and attribution when provided", () => {
    const padding = cycleHireFitPadding(48, {
      above: 24,
      below: 90,
      halfWidth: 56,
      attributionHeight: 24,
      showNavigation: false,
    })
    assert.equal(padding.top, CYCLE_HIRE_MAP_EDGE_BREATHING_PX + 24)
    assert.equal(padding.bottom, CYCLE_HIRE_MAP_EDGE_BREATHING_PX + 90 + 24)
    assert.equal(padding.left, CYCLE_HIRE_MAP_EDGE_BREATHING_PX + 56)
    assert.equal(padding.right, CYCLE_HIRE_MAP_EDGE_BREATHING_PX + 56)
  })
})

describe("clampCycleHireFitPadding", () => {
  it("scales padding to fit a short canvas without flipping the ratio", () => {
    const padding = cycleHireFitPadding(48, {
      below: 90,
      attributionHeight: 28,
    })
    const clamped = clampCycleHireFitPadding(padding, 320, 80)
    assert.ok(clamped.top + clamped.bottom <= 80)
    assert.ok(clamped.bottom > clamped.top)
  })
})

describe("resolveCycleHireLabelSides", () => {
  it("flips a northern label up when it would cover a pin to the south", () => {
    const sides = resolveCycleHireLabelSides(
      [
        { id: "william-iv", x: 200, y: 80 },
        { id: "craven", x: 200, y: 130 },
        { id: "charles-ii", x: 60, y: 110 },
      ],
      { markerSize: 28, mapWidth: 320, mapHeight: 240, attributionHeight: 28 }
    )
    assert.equal(sides.get("william-iv"), "above")
    assert.equal(sides.get("craven"), "below")
    assert.equal(sides.get("charles-ii"), "below")
  })

  it("keeps labels below when pins are far apart", () => {
    const sides = resolveCycleHireLabelSides(
      [
        { id: "north", x: 80, y: 60 },
        { id: "south", x: 220, y: 200 },
      ],
      { markerSize: 48, mapWidth: 320, mapHeight: 400, attributionHeight: 28 }
    )
    assert.equal(sides.get("north"), "below")
    assert.equal(sides.get("south"), "below")
  })

  it("flips up when a below label would leave the map", () => {
    const sides = resolveCycleHireLabelSides([{ id: "edge", x: 160, y: 220 }], {
      markerSize: 48,
      mapWidth: 320,
      mapHeight: 240,
      attributionHeight: 28,
    })
    assert.equal(sides.get("edge"), "above")
  })
})
