import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, it } from "node:test"

const root = dirname(fileURLToPath(import.meta.url))

const read = (relative: string) => readFileSync(join(root, relative), "utf8")

describe("homepage iPad preview layout", () => {
  it("lets the phone canvas pinch the framed board and clamps zoom-out", () => {
    const scene = read("../../app/temp/landing-hero/landing-scene.tsx")
    const input = read("../../app/temp/landing-hero/use-parallax-input.ts")
    const zoom = read("../../app/temp/landing-hero/use-ipad-zoom.ts")
    const css = read("../../app/globals.css")
    assert.match(
      scene,
      /const canvasLook = roomComplete \|\| phoneCanvas === true/
    )
    assert.match(scene, /enabled: !reducedMotion && canvasLook/)
    assert.match(scene, /onPhoneDolly: phoneCanvas === true \? setPhoneDolly/)
    assert.match(scene, /phoneDeepScaleRef/)
    assert.match(zoom, /setPhoneDolly/)
    assert.match(zoom, /phoneZoomToCamera/)
    assert.match(input, /phoneZoomFromPinch/)
    assert.match(input, /#landing-example-board/)
    assert.match(input, /gesturestart/)
    assert.match(input, /touches\.length >= 2/)
    assert.match(
      css,
      /html:has\(\.landing-home\)[\s\S]*overscroll-behavior:\s*none/
    )
    assert.match(css, /touch-action:\s*pan-y/)
  })
})
