import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  labelScreenScale,
  originAtBoundsCenter,
  stationGraphScales,
  zoomAround,
} from "./station-graph-scale"

const screenFont = (
  labelScale: number,
  zoomScale: number,
  viewBox: { w: number; h: number },
  viewport: { w: number; h: number }
) =>
  11 *
  labelScale *
  zoomScale *
  Math.min(viewport.w / viewBox.w, viewport.h / viewBox.h)

describe("station graph label scale", () => {
  it("keeps the same screen font on a wide line and a compact line", () => {
    const viewport = { w: 1044, h: 576 }
    const elizabeth = { w: 2507, h: 1209 }
    const northern = { w: 4200, h: 2800 }
    const zoom = 1.8
    const elizabethScale = stationGraphScales(zoom, elizabeth, viewport)
    const northernScale = stationGraphScales(zoom, northern, viewport)
    const expected = 11 * labelScreenScale(zoom)
    assert.ok(
      Math.abs(
        screenFont(elizabethScale.labelScale, zoom, elizabeth, viewport) -
          expected
      ) < 1e-9
    )
    assert.ok(
      Math.abs(
        screenFont(northernScale.labelScale, zoom, northern, viewport) -
          expected
      ) < 1e-9
    )
  })

  it("keeps a pan anchored when the scale is clamped", () => {
    const next = zoomAround({ scale: 1, x: 4, y: 6 }, 40, { x: 10, y: 20 })
    assert.equal(next.scale, 8)
    assert.ok(Number.isFinite(next.x) && Number.isFinite(next.y))
  })

  it("shrinks labels when zoomed out and caps them when zoomed in", () => {
    const out = labelScreenScale(0.75)
    const mid = labelScreenScale(1)
    const far = labelScreenScale(8)
    assert.ok(out < mid)
    assert.ok(far <= 1.25 + 1e-9)
    assert.equal(labelScreenScale(8), labelScreenScale(6))
  })

  it("places the max bound rectangle on the origin", () => {
    const centered = originAtBoundsCenter([
      { x: 10, y: 4 },
      { x: 40, y: 10 },
      { x: 10, y: 22 },
    ])
    const xs = centered.map((node) => node.x)
    const ys = centered.map((node) => node.y)
    assert.ok(Math.abs(Math.min(...xs) + Math.max(...xs)) < 1e-9)
    assert.ok(Math.abs(Math.min(...ys) + Math.max(...ys)) < 1e-9)
  })
})
