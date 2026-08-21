/**
 * Compose exported placeholder-roundel SVG frames into one inspectable atlas.
 *
 *   pnpm roundel-spin:sprite --dir scratch/placeholder-roundel-spin
 *
 * Expects frame-000.svg, frame-001.svg, … in --dir.
 * Writes atlas.svg and metadata.json alongside the frames (or to --out / --meta).
 */

import { readdirSync, readFileSync, writeFileSync } from "node:fs"
import { join, resolve } from "node:path"
import {
  atlasLayout,
  composeSvgAtlas,
  DEFAULT_PLACEHOLDER_ROUNDEL_SPIN_CONFIG,
  spriteMeta,
  type PlaceholderRoundelSpinConfig,
  type PlaceholderRoundelSpriteMeta,
} from "../lib/temp/placeholder-roundel-spin"

const argValue = (flag: string): string | undefined => {
  const index = process.argv.indexOf(`--${flag}`)
  if (index === -1) return undefined
  return process.argv[index + 1]
}

const asNumber = (value: string | undefined, fallback: number): number => {
  if (value == null) return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const dir = resolve(argValue("dir") ?? "scratch/placeholder-roundel-spin")
const frameFiles = readdirSync(dir)
  .filter((name) => /^frame-\d+\.svg$/.test(name))
  .sort()

if (frameFiles.length === 0) {
  throw new Error(`No frame-*.svg files in ${dir}`)
}

const frames = frameFiles.map((name) => readFileSync(join(dir, name), "utf8"))

const existingMetaPath = join(dir, "metadata.json")
let baseConfig: PlaceholderRoundelSpinConfig =
  DEFAULT_PLACEHOLDER_ROUNDEL_SPIN_CONFIG
try {
  const existing = JSON.parse(
    readFileSync(existingMetaPath, "utf8")
  ) as PlaceholderRoundelSpriteMeta
  if (existing.config) {
    baseConfig = {
      ...DEFAULT_PLACEHOLDER_ROUNDEL_SPIN_CONFIG,
      ...existing.config,
    }
  }
} catch {
  // metadata.json is optional on the first compose pass
}

const config: PlaceholderRoundelSpinConfig = {
  ...baseConfig,
  frameCount: asNumber(argValue("frames"), frames.length),
  spriteRows: asNumber(argValue("rows"), baseConfig.spriteRows),
  frameWidth: asNumber(argValue("frame-width"), baseConfig.frameWidth),
  frameHeight: asNumber(argValue("frame-height"), baseConfig.frameHeight),
  durationMs: asNumber(argValue("duration"), baseConfig.durationMs),
}

const { optimizeRoundelSvg } = await import(
  "../lib/temp/placeholder-roundel-spin/optimize-svg"
)

const layout = atlasLayout({ ...config, frameCount: frames.length })
const prepared = frames.map((frame) => optimizeRoundelSvg(frame))
const atlas = composeSvgAtlas(prepared, {
  ...config,
  frameCount: frames.length,
})
const meta = {
  ...spriteMeta(config),
  ...layout,
  frameCount: frames.length,
}

const outPath = resolve(argValue("out") ?? join(dir, "atlas.svg"))
const metaPath = resolve(argValue("meta") ?? join(dir, "metadata.json"))

writeFileSync(outPath, atlas)
writeFileSync(metaPath, `${JSON.stringify(meta, null, 2)}\n`)

console.log(
  `Wrote ${outPath} (${layout.atlasWidth}×${layout.atlasHeight}, ${layout.columns}×${layout.rows})`
)
console.log(`Wrote ${metaPath}`)
