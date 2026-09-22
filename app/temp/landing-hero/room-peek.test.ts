import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  DEFAULT_PEEK,
  clampPeekPan,
  clampPeekScale,
  peekPanByPixels,
  peekPanLimit,
  peekScaleAboutPoint,
  sanitizePeek,
  touchDistance,
  touchMidpoint,
} from "./room-peek"

describe("room-peek", () => {
  it("clamps scale into the peek range", () => {
    assert.equal(clampPeekScale(0.5), 1)
    assert.equal(clampPeekScale(1.2), 1.2)
    assert.equal(clampPeekScale(3), 1.85)
  })

  it("allows no pan at rest scale", () => {
    assert.equal(peekPanLimit(1), 0)
    assert.equal(clampPeekPan(0.5, 1), 0)
  })

  it("widens pan as scale grows", () => {
    assert.ok(peekPanLimit(1.4) > peekPanLimit(1.1))
    assert.ok(peekPanLimit(1.85) > peekPanLimit(1.4))
  })

  it("measures pinch distance and midpoint", () => {
    assert.equal(touchDistance({ clientX: 0, clientY: 0 }, { clientX: 3, clientY: 4 }), 5)
    assert.deepEqual(
      touchMidpoint({ clientX: 0, clientY: 10 }, { clientX: 10, clientY: 0 }),
      { x: 5, y: 5 }
    )
  })

  it("keeps the pinch midpoint stable when scaling", () => {
    const next = peekScaleAboutPoint({
      peek: { scale: 1, panX: 0, panY: 0 },
      nextScale: 2,
      pointX: 100,
      pointY: 50,
      rectLeft: 0,
      rectTop: 0,
      rectWidth: 200,
      rectHeight: 100,
    })
    assert.equal(next.scale, 1.85)
    // Midpoint is centre (nx=0, ny=0) → pan stays ~0.
    assert.ok(Math.abs(next.panX) < 1e-9)
    assert.ok(Math.abs(next.panY) < 1e-9)
  })

  it("pans only while zoomed", () => {
    const rested = peekPanByPixels({
      peek: DEFAULT_PEEK,
      dx: 40,
      dy: -20,
      rectWidth: 200,
      rectHeight: 100,
    })
    assert.deepEqual(rested, DEFAULT_PEEK)

    const zoomed = peekPanByPixels({
      peek: { scale: 1.5, panX: 0, panY: 0 },
      dx: 40,
      dy: -20,
      rectWidth: 200,
      rectHeight: 100,
    })
    assert.ok(zoomed.panX > 0)
    assert.ok(zoomed.panY < 0)
  })

  it("sanitizes out-of-range peek state", () => {
    assert.deepEqual(
      sanitizePeek({ scale: 4, panX: 9, panY: -9 }),
      {
        scale: 1.85,
        panX: peekPanLimit(1.85),
        panY: -peekPanLimit(1.85),
      }
    )
  })
})
