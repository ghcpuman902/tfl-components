import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { CROP_SCALE } from "@/app/temp/landing-hero/scene-constants"
import { computeCoverCanvas } from "./cover-canvas"

const LANDING_VIEWBOX_WIDTH = 1559.3951
const LANDING_VIEWBOX_HEIGHT = 1011.3564

const viewports = [
  { name: "phone portrait", width: 390, height: 844 },
  { name: "phone landscape", width: 844, height: 390 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
  { name: "ultrawide", width: 1920, height: 800 },
] as const

describe("computeCoverCanvas", () => {
  it("always overflow-covers the viewport so the room has no side gap", () => {
    for (const viewport of viewports) {
      const canvas = computeCoverCanvas({
        viewportWidth: viewport.width,
        viewportHeight: viewport.height,
        viewBoxWidth: LANDING_VIEWBOX_WIDTH,
        viewBoxHeight: LANDING_VIEWBOX_HEIGHT,
        cropScale: CROP_SCALE,
      })
      assert.ok(
        canvas.width >= viewport.width,
        `${viewport.name} width ${canvas.width} < ${viewport.width}`
      )
      assert.ok(
        canvas.height >= viewport.height,
        `${viewport.name} height ${canvas.height} < ${viewport.height}`
      )
    }
  })
})
