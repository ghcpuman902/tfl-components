/**
 * Project intro + hover clips to circle+stroke SVGs, SVGO-compress them,
 * and write the production header atlas.
 *
 *   pnpm roundel-spin:build
 */

import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import {
  composeSvgAtlas,
  DEFAULT_PLACEHOLDER_ROUNDEL_SPIN_CONFIG,
  renderSvgClips,
  spriteMeta,
} from "../lib/temp/placeholder-roundel-spin"
import { optimizeRoundelSvg } from "../lib/temp/placeholder-roundel-spin/optimize-svg"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const atlasPath = join(root, "public/brand/placeholder-roundel-spin.svg")
const metaPath = join(root, "lib/brand/placeholder-roundel-spin-meta.ts")

const config = DEFAULT_PLACEHOLDER_ROUNDEL_SPIN_CONFIG
const result = renderSvgClips(config)
if (!result.ok) {
  throw new Error(result.error)
}

const prepared = result.frames.map((frame) => optimizeRoundelSvg(frame))
const meta = spriteMeta(config)
const atlas = composeSvgAtlas(prepared, {
  ...config,
  frameCount: meta.frameCount,
})

mkdirSync(dirname(atlasPath), { recursive: true })
writeFileSync(atlasPath, `${atlas}\n`)
writeFileSync(
  metaPath,
  `export const PLACEHOLDER_ROUNDEL_SPIN_ATLAS = "/brand/placeholder-roundel-spin.svg"

export const PLACEHOLDER_ROUNDEL_SPIN_META = ${JSON.stringify(meta, null, 2)} as const
`
)

const before = result.frames.reduce((sum, frame) => sum + frame.length, 0)
const after = Buffer.byteLength(atlas)
console.log(
  `Wrote ${atlasPath}  ${(before / 1024).toFixed(0)}kb raw frames → ${(after / 1024).toFixed(1)}kb atlas`
)
console.log(
  `${meta.frameCount} frames · ${meta.columns}×${meta.rows} · clips ${meta.clips.map((clip) => clip.id).join(", ")}`
)
console.log(`Wrote ${metaPath}`)
