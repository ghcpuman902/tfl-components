import type { PlaceholderRoundelSpinConfig } from "./config"
import { clipPlan, totalClipFrames, type ClipPlanItem } from "./clips"

export type AtlasLayout = {
  frameCount: number
  rows: number
  columns: number
  frameWidth: number
  frameHeight: number
  atlasWidth: number
  atlasHeight: number
}

export const atlasLayout = (
  config: Pick<
    PlaceholderRoundelSpinConfig,
    "frameCount" | "spriteRows" | "frameWidth" | "frameHeight"
  >
): AtlasLayout => {
  const frameCount = Math.max(1, Math.round(config.frameCount))
  const rows = Math.max(1, Math.round(config.spriteRows))
  const columns = Math.ceil(frameCount / rows)
  const frameWidth = Math.max(1, Math.round(config.frameWidth))
  const frameHeight = Math.max(1, Math.round(config.frameHeight))
  return {
    frameCount,
    rows,
    columns,
    frameWidth,
    frameHeight,
    atlasWidth: columns * frameWidth,
    atlasHeight: rows * frameHeight,
  }
}

export const atlasCell = (frameIndex: number, layout: AtlasLayout) => {
  const index = Math.min(Math.max(0, frameIndex), layout.frameCount - 1)
  const column = index % layout.columns
  const row = Math.floor(index / layout.columns)
  return {
    column,
    row,
    x: column * layout.frameWidth,
    y: row * layout.frameHeight,
  }
}

export type PlaceholderRoundelSpriteMeta = AtlasLayout & {
  durationMs: number
  config: PlaceholderRoundelSpinConfig
  clips: ClipPlanItem[]
}

export const spriteMeta = (
  config: PlaceholderRoundelSpinConfig
): PlaceholderRoundelSpriteMeta => {
  const clips = clipPlan(config)
  const frameCount = totalClipFrames(config)
  return {
    ...atlasLayout({ ...config, frameCount }),
    durationMs: config.durationMs,
    config,
    clips,
  }
}
