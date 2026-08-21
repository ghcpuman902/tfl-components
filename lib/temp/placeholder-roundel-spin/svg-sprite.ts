import { atlasCell, atlasLayout, type AtlasLayout } from "./atlas"
import type { PlaceholderRoundelSpinConfig } from "./config"

const SVG_NS = "http://www.w3.org/2000/svg"

export const padFrameIndex = (index: number): string =>
  String(index).padStart(3, "0")

export const frameFileName = (index: number): string =>
  `frame-${padFrameIndex(index)}.svg`

export type ParsedSvg = {
  viewBox: string
  inner: string
  width: number
  height: number
}

export const parseSvgDocument = (svg: string): ParsedSvg => {
  const viewBoxMatch = svg.match(/viewBox=["']([^"']+)["']/)
  const widthMatch = svg.match(/\bwidth=["']([\d.]+)["']/)
  const heightMatch = svg.match(/\bheight=["']([\d.]+)["']/)
  const inner = svg
    .replace(/<\?xml[^>]*>/g, "")
    .replace(/^[\s\S]*?<svg[^>]*>/i, "")
    .replace(/<\/svg>\s*$/i, "")
  const width = widthMatch ? Number(widthMatch[1]) : 0
  const height = heightMatch ? Number(heightMatch[1]) : 0
  return {
    viewBox: viewBoxMatch?.[1] ?? `0 0 ${width} ${height}`,
    inner,
    width,
    height,
  }
}

export const composeSvgAtlas = (
  frames: readonly string[],
  config: Pick<
    PlaceholderRoundelSpinConfig,
    "frameCount" | "spriteRows" | "frameWidth" | "frameHeight"
  >
): string => {
  const layout = atlasLayout(config)
  const cells = frames.map((svg, index) => {
    const parsed = parseSvgDocument(svg)
    const cell = atlasCell(index, layout)
    return `<svg x="${cell.x}" y="${cell.y}" width="${layout.frameWidth}" height="${layout.frameHeight}" viewBox="${parsed.viewBox}">${parsed.inner}</svg>`
  })

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="${SVG_NS}" width="${layout.atlasWidth}" height="${layout.atlasHeight}" viewBox="0 0 ${layout.atlasWidth} ${layout.atlasHeight}">`,
    ...cells,
    `</svg>`,
    ``,
  ].join("\n")
}

export const describeAtlas = (layout: AtlasLayout): string =>
  `${layout.atlasWidth}×${layout.atlasHeight} · ${layout.columns}×${layout.rows} · ${layout.frameWidth}×${layout.frameHeight} frames`
