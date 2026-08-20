import fs from "node:fs"
import {
  ARTWORK_CSS,
  ARTWORK_TSX,
  SOURCE_SVG,
  assertRequiredIds,
} from "./svg-ids.mjs"

const tsx = fs.readFileSync(ARTWORK_TSX, "utf8")
const css = fs.readFileSync(ARTWORK_CSS, "utf8")

const svgMatch = tsx.match(/<svg[\s\S]*<\/svg>/)
if (!svgMatch) throw new Error(`no <svg> in ${ARTWORK_TSX}`)

const viewBoxMatch = svgMatch[0].match(/viewBox="([^"]+)"/)
if (!viewBoxMatch) throw new Error("missing viewBox")
const viewBox = viewBoxMatch[1]
const [ , , vbWidth, vbHeight] = viewBox.split(/\s+/)

let inner = svgMatch[0]
  .replace(/^[\s\S]*?<svg[^>]*>\n?/, "")
  .replace(/\n?<\/svg>\s*$/, "")

inner = inner
  .replace(/\s+ref=\{[^}]+\}/g, "")
  .replace(/className="/g, 'class="')
  .replace(/landing-cls-/g, "cls-")
  .replace(/<foreignObject[\s\S]*?<\/foreignObject>\s*/g, "")
  .replace(
    /<rect[^>]*aria-label="Zoom in to the station display"[\s\S]*?\/>\s*/g,
    "",
  )

const indent = inner.match(/^ +/m)?.[0].length ?? 0
const body = inner
  .split("\n")
  .map((line) => {
    const leading = line.match(/^ */)?.[0].length ?? 0
    return line.slice(Math.min(indent, leading))
  })
  .join("\n")
  .trimEnd()

const style = css
  .replace(/\.landing-cls-/g, ".cls-")
  .trim()
  .split("\n")
  .map((line) => (line === "" ? "" : `      ${line}`))
  .join("\n")

const comment = `  <!--
    Canonical landing artwork for Illustrator.
    Edit this file, keep the ids listed in svg-ids.mjs, keep cls-* classes
    (do not expand appearance to RGB fills), then:
      node app/temp/landing-hero/convert-svg.mjs
  -->`

const out = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${vbWidth}" height="${vbHeight}">
${comment}
  <defs>
    <style>
${style}
    </style>
  </defs>
  ${body}
</svg>
`

assertRequiredIds(out)
fs.writeFileSync(SOURCE_SVG, `${out.trimEnd()}\n`)
console.log("wrote", SOURCE_SVG, `${(Buffer.byteLength(out) / 1024).toFixed(1)}kb`)
