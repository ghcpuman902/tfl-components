import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, it } from "node:test"
import {
  clampPx,
  HERO_COPY_MAX_WIDTH_PX,
  HERO_COPY_PADDING_X_PX,
  HERO_FONT,
  HERO_HEADLINE_CLAMP,
  HERO_HEADLINE_LINE_HEIGHT,
  HERO_SUBLINE_CLAMP,
  HERO_SUBLINE_LINE_HEIGHT,
  heroTextWidth,
} from "@/lib/landing/hero-type"

const root = dirname(fileURLToPath(import.meta.url))
const read = (relative: string) => readFileSync(join(root, relative), "utf8")

const clampString = ({
  minRem,
  baseRem,
  vw,
  maxRem,
}: typeof HERO_HEADLINE_CLAMP) =>
  `clamp(${minRem}rem,${baseRem}rem+${vw}vw,${maxRem}rem)`

describe("hero type mirrors what ships", () => {
  const fold = read("../../components/landing/landing-fold-copy.tsx")
  const css = read("../../app/globals.css")
  const layout = read("../../app/layout.tsx")

  it("headline and subline size, leading and container match the component", () => {
    assert.ok(fold.includes(`text-[${clampString(HERO_HEADLINE_CLAMP)}]`))
    assert.ok(fold.includes(`leading-[${HERO_HEADLINE_LINE_HEIGHT}]`))
    assert.ok(fold.includes(`text-[${clampString(HERO_SUBLINE_CLAMP)}]`))
    assert.ok(fold.includes(`leading-[${HERO_SUBLINE_LINE_HEIGHT}]`))
    assert.ok(fold.includes("max-w-xl"), "max-w-xl is 36rem")
    assert.equal(HERO_COPY_MAX_WIDTH_PX, 36 * 16)
    assert.ok(fold.includes("px-4"), "px-4 is 1rem a side")
    assert.equal(HERO_COPY_PADDING_X_PX, 16)
    assert.ok(fold.includes("tfl-title"))
  })

  it("default face, weight and tracking match :root and next/font", () => {
    assert.match(
      css,
      /:root \{\s*--tfl-title-weight: 400;\s*--tfl-title-tracking: 0;/
    )
    assert.equal(HERO_FONT.weight, 400)
    assert.equal(HERO_FONT.trackingEm, 0)
    assert.match(layout, /Hammersmith_One\(\{\s*weight: "400"/)
    assert.equal(HERO_FONT.family, "Hammersmith One")
  })

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
