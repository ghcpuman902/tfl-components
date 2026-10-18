import { readFileSync } from "node:fs"

/**
 * Minimal TrueType reader for the tagline gate: advance widths from
 * `hmtx` through the Unicode `cmap`. Node only (tests and scripts).
 *
 * Stand-in for `@chenglou/pretext`, which needs a canvas (it throws under
 * Node) and could not be installed in the agent sandbox. Hammersmith One has
 * no `kern`/`GPOS` table, so advance widths are the whole story for the
 * default face. The `Measure` seam in `tagline-shape.ts` takes either.
 */
export type FontMetrics = {
  unitsPerEm: number
  /** Width in px of `text` at `sizePx`, plus `letterSpacingPx` per character. */
  width: (text: string, sizePx: number, letterSpacingPx?: number) => number
}

const readTables = (buffer: Buffer) => {
  const count = buffer.readUInt16BE(4)
  const tables = new Map<string, number>()
  for (let index = 0; index < count; index += 1) {
    const record = 12 + index * 16
    tables.set(
      buffer.toString("ascii", record, record + 4),
      buffer.readUInt32BE(record + 8)
    )
  }
  return tables
}

const readCmap = (buffer: Buffer, cmapOffset: number): Map<number, number> => {
  const subtableCount = buffer.readUInt16BE(cmapOffset + 2)
  let chosen = -1
  for (let index = 0; index < subtableCount; index += 1) {
    const record = cmapOffset + 4 + index * 8
    const platform = buffer.readUInt16BE(record)
    const encoding = buffer.readUInt16BE(record + 2)
    const offset = cmapOffset + buffer.readUInt32BE(record + 4)
    const format = buffer.readUInt16BE(offset)
    const unicode =
      platform === 0 || (platform === 3 && (encoding === 1 || encoding === 10))
    if (unicode && (format === 4 || format === 12)) chosen = offset
  }
  if (chosen < 0) throw new Error("No Unicode cmap (format 4 or 12) in font")

  const map = new Map<number, number>()
  const format = buffer.readUInt16BE(chosen)
  if (format === 12) {
    const groups = buffer.readUInt32BE(chosen + 12)
    for (let index = 0; index < groups; index += 1) {
      const group = chosen + 16 + index * 12
      const start = buffer.readUInt32BE(group)
      const end = buffer.readUInt32BE(group + 4)
      const glyph = buffer.readUInt32BE(group + 8)
      for (let code = start; code <= end; code += 1)
        map.set(code, glyph + (code - start))
    }
    return map
  }

  const segments = buffer.readUInt16BE(chosen + 6) / 2
  const endCodes = chosen + 14
  const startCodes = endCodes + segments * 2 + 2
  const deltas = startCodes + segments * 2
  const rangeOffsets = deltas + segments * 2
  for (let segment = 0; segment < segments; segment += 1) {
    const end = buffer.readUInt16BE(endCodes + segment * 2)
    const start = buffer.readUInt16BE(startCodes + segment * 2)
    const delta = buffer.readUInt16BE(deltas + segment * 2)
    const rangeOffset = buffer.readUInt16BE(rangeOffsets + segment * 2)
    for (let code = start; code <= end && code !== 0xffff; code += 1) {
      let glyph: number
      if (rangeOffset === 0) {
        glyph = (code + delta) & 0xffff
      } else {
        const at = rangeOffsets + segment * 2 + rangeOffset + (code - start) * 2
        const raw = buffer.readUInt16BE(at)
        glyph = raw === 0 ? 0 : (raw + delta) & 0xffff
      }
      map.set(code, glyph)
    }
  }
  return map
}

export const loadFontMetrics = (path: string): FontMetrics => {
  const buffer = readFileSync(path)
  const tables = readTables(buffer)
  const head = tables.get("head")
  const hhea = tables.get("hhea")
  const hmtx = tables.get("hmtx")
  const cmap = tables.get("cmap")
  if (
    head === undefined ||
    hhea === undefined ||
    hmtx === undefined ||
    cmap === undefined
  ) {
    throw new Error(`Font ${path} is missing head, hhea, hmtx or cmap`)
  }
  const unitsPerEm = buffer.readUInt16BE(head + 18)
  const metricCount = buffer.readUInt16BE(hhea + 34)
  const glyphs = readCmap(buffer, cmap)
  const advance = (glyph: number) => {
    const index = Math.min(glyph, metricCount - 1)
    return buffer.readUInt16BE(hmtx + index * 4)
  }

  return {
    unitsPerEm,
    width: (text, sizePx, letterSpacingPx = 0) => {
      let units = 0
      let characters = 0
      for (const character of text) {
        const code = character.codePointAt(0) ?? 0
        const glyph = glyphs.get(code)
        if (glyph === undefined)
          throw new Error(`No glyph for U+${code.toString(16)} (${character})`)
        units += advance(glyph)
        characters += 1
      }
      return (units * sizePx) / unitsPerEm + characters * letterSpacingPx
    },
  }
}
