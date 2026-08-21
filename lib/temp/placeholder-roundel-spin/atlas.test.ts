import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { atlasCell, atlasLayout } from "./atlas"
import { derivePlaceholderRoundel3d, sphereSvgRadius } from "./geometry"
import { optimizeRoundelSvg } from "./optimize-svg"
import { composeSvgAtlas, parseSvgDocument } from "./svg-sprite"

describe("placeholder roundel sprite atlas", () => {
  it("derives torus proportions from the SVG bar, not a new logo", () => {
    const derived = derivePlaceholderRoundel3d()
    assert.equal(derived.sphereRadius, 250)
    assert.equal(derived.ringThickness, 50.55)
    assert.equal(derived.ringRadius, 257.1)
  })

  it("maps the sphere to a true circle in the ±100 SVG frame", () => {
    const radius = sphereSvgRadius(250, 1, 200)
    assert.ok(radius > 80 && radius < 82)
    assert.equal(Math.round(sphereSvgRadius(250, 0.92, 200) * 10) / 10, 74.8)
  })

  it("lays out frames by configurable rows, not a forced single strip", () => {
    const layout = atlasLayout({
      frameCount: 32,
      spriteRows: 4,
      frameWidth: 64,
      frameHeight: 64,
    })
    assert.equal(layout.columns, 8)
    assert.equal(layout.atlasWidth, 512)
    assert.equal(layout.atlasHeight, 256)

    const wide = atlasLayout({
      frameCount: 32,
      spriteRows: 1,
      frameWidth: 64,
      frameHeight: 64,
    })
    assert.equal(wide.columns, 32)
    assert.equal(wide.atlasWidth, 2048)
    assert.equal(wide.atlasHeight, 64)

    const last = atlasCell(31, layout)
    assert.equal(last.column, 7)
    assert.equal(last.row, 3)
  })

  it("nests each frame SVG without minifying it", () => {
    const frame = `<svg viewBox="-32 -32 64 64" width="64" height="64"><path d="M0 0h1v1z" fill="#888"/></svg>`
    const atlas = composeSvgAtlas([frame, frame], {
      frameCount: 2,
      spriteRows: 1,
      frameWidth: 64,
      frameHeight: 64,
    })
    assert.match(atlas, /<path d="M0 0h1v1z" fill="#888"\/>/)
    assert.match(atlas, /x="64"/)
    assert.equal(parseSvgDocument(frame).viewBox, "-32 -32 64 64")
  })

  it("keeps a ±100 SVG frame when nesting into a 64px atlas cell", () => {
    const frame = `<svg viewBox="-100 -100 200 200" width="200" height="200"><path d="M0 0h1v1z"/></svg>`
    const atlas = composeSvgAtlas([frame], {
      frameCount: 1,
      spriteRows: 1,
      frameWidth: 64,
      frameHeight: 64,
    })
    assert.match(atlas, /width="64"/)
    assert.match(atlas, /viewBox="-100 -100 200 200"/)
  })

  it("keeps nested atlas cell positions when optimizing a frame", () => {
    const atlas = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="64" viewBox="0 0 128 64"><svg x="64" y="0" width="64" height="64" viewBox="-100 -100 200 200"><circle cx="0" cy="0" r="10" fill="#cecece"/></svg></svg>`
    const out = optimizeRoundelSvg(atlas)
    assert.match(out, /x="64"/)
    assert.match(out, /#cecece/)
    assert.doesNotMatch(out, /currentColor/)
  })
})
