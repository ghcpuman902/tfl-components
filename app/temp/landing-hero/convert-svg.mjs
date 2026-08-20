import fs from "node:fs"
import {
  ARTWORK_CSS,
  ARTWORK_TSX,
  HOLE_IDS,
  IPAD_HIT_PAD,
  LAYER_REFS,
  SOURCE_SVG,
  TRACKING_REFS,
  assertRequiredIds,
} from "./svg-ids.mjs"

const src = fs.readFileSync(SOURCE_SVG, "utf8")
assertRequiredIds(src)

const viewBoxMatch = src.match(/viewBox="([^"]+)"/)
if (!viewBoxMatch) throw new Error("missing viewBox")
const viewBox = viewBoxMatch[1]
const [, , vbWidth, vbHeight] = viewBox.split(/\s+/)

const styleMatch = src.match(/<style>\s*([\s\S]*?)\s*<\/style>/)
if (styleMatch) {
  const css = styleMatch[1]
    .replace(/^\s+/gm, "")
    .replace(/\.cls-/g, ".landing-cls-")
    .trim()
  fs.writeFileSync(ARTWORK_CSS, `${css}\n`)
} else {
  console.warn("no <style> in source SVG; keeping existing landing-artwork.css")
}

let body = src
  .replace(/<\?xml[^>]*>\s*/u, "")
  .replace(/<!--[\s\S]*?-->\s*/u, "")
  .replace(/<defs>\s*<style>[\s\S]*?<\/style>\s*<\/defs>\s*/u, "")
  .replace(/\s+width="[^"]*"/, "")
  .replace(/\s+height="[^"]*"/, "")
  .replace(/class="/g, 'className="')
  .replace(/cls-/g, "landing-cls-")
  .trim()

body = body.replace(
  /<svg([^>]*)>/,
  `<svg$1 ref={svgRef} className="landing-artwork block size-full" preserveAspectRatio="xMidYMid meet">`,
)

for (const [id, refName] of Object.entries({ ...LAYER_REFS, ...TRACKING_REFS })) {
  const next = body.replace(
    new RegExp(`<(g|rect|path|polygon)([^>]*\\sid="${id}")`),
    `<$1 ref={${refName}}$2`,
  )
  if (next === body) throw new Error(`could not attach ref to #${id}`)
  body = next
}

const attr = (attrs, name) => {
  const match = attrs.match(new RegExp(`${name}="([^"]*)"`))
  if (!match) throw new Error(`missing ${name} on element`)
  return match[1]
}

const rectBox = (id) => {
  const match = body.match(
    new RegExp(`<rect([^>]*\\sid="${id}"[^>]*)(?:/>|>\\s*</rect>)`),
  )
  if (!match) throw new Error(`missing <rect id="${id}">`)
  const attrs = match[1]
  return {
    x: Number(attr(attrs, "x")),
    y: Number(attr(attrs, "y")),
    width: Number(attr(attrs, "width")),
    height: Number(attr(attrs, "height")),
    rx: attrs.includes("rx=") ? Number(attr(attrs, "rx")) : undefined,
  }
}

const injectAfterId = (id, snippet) => {
  const re = new RegExp(
    `(<(?:rect|path)[^>]*id="${id}"[^>]*(?:/>|>\\s*</(?:rect|path)>))`,
  )
  const next = body.replace(re, `$1${snippet}`)
  if (next === body) throw new Error(`could not inject after #${id}`)
  body = next
}

const IPAD_SCREEN = rectBox(HOLE_IDS.ipadScreen)
const PICTURE_FRAME_1 = rectBox(HOLE_IDS.pictureMat1)
const PICTURE_FRAME_2 = rectBox(HOLE_IDS.pictureMat2)

injectAfterId(
  HOLE_IDS.ipadScreen,
  `
          <rect
            ref={iPadHitRef}
            x="${IPAD_SCREEN.x + IPAD_HIT_PAD.x}"
            y="${IPAD_SCREEN.y + IPAD_HIT_PAD.y}"
            width="${IPAD_SCREEN.width + IPAD_HIT_PAD.width}"
            height="${IPAD_SCREEN.height + IPAD_HIT_PAD.height}"
            fill="transparent"
            className="cursor-pointer"
            tabIndex={0}
            role="button"
            aria-label="Zoom in to the station display"
            onClick={onIpadClick}
            onKeyDown={onIpadKeyDown}
          />`,
)

const header = `"use client"

import type { KeyboardEvent, Ref } from "react"
import { heroArtworkThemeStyleSheet } from "@/app/temp/landing-palette/palette"
import "./landing-artwork.css"

const ARTWORK_THEME_CSS = heroArtworkThemeStyleSheet()

export const LANDING_VIEWBOX = "${viewBox}"
export const LANDING_VIEWBOX_WIDTH = ${vbWidth}
export const LANDING_VIEWBOX_HEIGHT = ${vbHeight}

export const IPAD_SCREEN = ${JSON.stringify(IPAD_SCREEN, null, 2)} as const
export const PICTURE_FRAME_1 = ${JSON.stringify(PICTURE_FRAME_1, null, 2)} as const
export const PICTURE_FRAME_2 = ${JSON.stringify(PICTURE_FRAME_2, null, 2)} as const

export const BOARD_IFRAME_WIDTH = 1280
export const BOARD_IFRAME_HEIGHT =
  BOARD_IFRAME_WIDTH * (IPAD_SCREEN.height / IPAD_SCREEN.width)
export const BOARD_IFRAME_RADIUS =
  BOARD_IFRAME_WIDTH * ((IPAD_SCREEN.rx ?? 0) / IPAD_SCREEN.width)

type LandingArtworkProps = {
  svgRef: Ref<SVGSVGElement | null>
  l0Ref: Ref<SVGGElement | null>
  l1Ref: Ref<SVGGElement | null>
  l2Ref: Ref<SVGGElement | null>
  l3Ref: Ref<SVGGElement | null>
  iPadRef: Ref<SVGGElement | null>
  iPadHitRef: Ref<SVGRectElement | null>
  iPadScreenRef: Ref<SVGRectElement | null>
  pictureMat1Ref: Ref<SVGRectElement | null>
  pictureMat2Ref: Ref<SVGRectElement | null>
  onIpadClick: () => void
  onIpadKeyDown: (event: KeyboardEvent<SVGRectElement>) => void
}

export const LandingArtwork = ({
  svgRef,
  l0Ref,
  l1Ref,
  l2Ref,
  l3Ref,
  iPadRef,
  iPadHitRef,
  iPadScreenRef,
  pictureMat1Ref,
  pictureMat2Ref,
  onIpadClick,
  onIpadKeyDown,
}: LandingArtworkProps) => (
  <>
  <style>{ARTWORK_THEME_CSS}</style>
`

const footer = `
  </>
)
`

fs.writeFileSync(ARTWORK_TSX, `${header}${body}${footer}`)
console.log("wrote", ARTWORK_TSX, body.length, "chars")
