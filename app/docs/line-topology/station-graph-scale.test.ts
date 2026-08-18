import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  labelScreenScale,
  stationGraphScales,
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
      Math.abs(screenFont(elizabethScale.labelScale, zoom, elizabeth, viewport) - expected) < 1e-9
    )
    assert.ok(
      Math.abs(screenFont(northernScale.labelScale, zoom, northern, viewport) - expected) < 1e-9
    )
  })
})
