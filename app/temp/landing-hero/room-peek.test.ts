import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  DEFAULT_PEEK,
  clampPeekPan,
  clampPeekScale,
  peekPanByPixels,
  peekPanLimit,
  peekScaleAboutPoint,
  PHONE_DEEP_SCALE_GAIN,
  PHONE_ZOOM_OUT,
  clampPhonePanToArtwork,
  phonePanForGesture,
  phoneZoomFromPinch,
  phoneZoomToCamera,
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
    assert.equal(
      touchDistance({ clientX: 0, clientY: 0 }, { clientX: 3, clientY: 4 }),
      5
    )
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

  it("pulls back to the room and keeps zooming in past the framed iPad", () => {
    assert.ok(phoneZoomFromPinch(0, 100, 50) > 0.5)
    assert.equal(phoneZoomFromPinch(PHONE_ZOOM_OUT, 40, 10), PHONE_ZOOM_OUT)
    assert.equal(phoneZoomFromPinch(PHONE_ZOOM_OUT, 100, 100), PHONE_ZOOM_OUT)
    const intoBoard = phoneZoomFromPinch(0, 80, 160)
    assert.ok(intoBoard < 0)
    const deeper = phoneZoomFromPinch(intoBoard, 40, 120)
    assert.ok(deeper < intoBoard)
  })

  it("keeps a second pinch at the zoom-out stop from jumping inward", () => {
    const held = phoneZoomFromPinch(PHONE_ZOOM_OUT, 90, 90)
    assert.equal(held, PHONE_ZOOM_OUT)
    const nudged = phoneZoomFromPinch(held, 90, 86)
    assert.equal(nudged, PHONE_ZOOM_OUT)
    assert.deepEqual(phoneZoomToCamera(PHONE_ZOOM_OUT), {
      zoom: 1,
      progress: 1,
      scale: 1,
    })
    assert.deepEqual(phoneZoomToCamera(0), {
      zoom: 0,
      progress: 0,
      scale: 1,
    })
    assert.deepEqual(phoneZoomToCamera(-1), {
      zoom: -1,
      progress: 0,
      scale: 1 + PHONE_DEEP_SCALE_GAIN,
    })
    assert.equal(phoneZoomToCamera(-4).scale, 1 + 4 * PHONE_DEEP_SCALE_GAIN)
  })

  it("pans with two fingers and stays on the artwork", () => {
    const panned = phonePanForGesture({
      panX: 0,
      panY: 0,
      startScale: 2,
      nextScale: 2,
      originX: 100,
      originY: 80,
      startX: 40,
      startY: 50,
      nextX: 70,
      nextY: 30,
    })
    assert.equal(panned.x, 30)
    assert.equal(panned.y, -20)
    assert.deepEqual(
      phonePanForGesture({
        panX: 10,
        panY: 10,
        startScale: 2,
        nextScale: 1,
        originX: 0,
        originY: 0,
        startX: 0,
        startY: 0,
        nextX: 20,
        nextY: 20,
      }),
      { x: 0, y: 0 }
    )
    const clamped = clampPhonePanToArtwork({
      panX: 5000,
      panY: -5000,
      scale: 3,
      originX: 50,
      originY: 40,
      viewLeft: 0,
      viewTop: 0,
      viewRight: 100,
      viewBottom: 80,
      artLeft: 0,
      artTop: 0,
      artRight: 200,
      artBottom: 160,
    })
    assert.ok(clamped.x < 5000)
    assert.ok(clamped.y > -5000)
  })

  it("sanitizes out-of-range peek state", () => {
    assert.deepEqual(sanitizePeek({ scale: 4, panX: 9, panY: -9 }), {
      scale: 1.85,
      panX: peekPanLimit(1.85),
      panY: -peekPanLimit(1.85),
    })
  })
})
