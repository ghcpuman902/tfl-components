import { splitTextFrames } from "@/lib/tfl/unattended-sequence"
import type { StatusBoardLine, StatusBoardSections } from "@/lib/tfl/status-board"

export type StatusDisplayPhase = "disruptions" | "good-service"
export type StatusDetailScope = "network" | "selection" | "none"

export type StatusDisplayTile =
  | {
      kind: "line"
      lineId: string
      name: string
      modeName?: string
    }
  | { kind: "text"; text: string }
  | { kind: "empty" }

export type StatusDisplayFrame = {
  id: string
  phase: StatusDisplayPhase
  heading: string
  headingLineIds: readonly string[]
  activeLineId?: string
  otherGoodServiceCopy?: string
  tiles: readonly StatusDisplayTile[]
}

export type StatusDisplayOptions = {
  tiles: number
  detailScope?: StatusDetailScope
  detailLineIds?: readonly string[]
  charsPerTile?: number
}

export type StatusStripAllocation = {
  showDisruptedSummary: boolean
  showOtherSummary: boolean
  reasonUnits: number
}

const DEFAULT_CHARS_PER_TILE = 80
const GOOD_SERVICE_OTHER = "Good service on all other lines"

const lineId = (row: StatusBoardLine): string =>
  row.line.id?.trim() || row.line.name?.trim() || "unknown"

const lineName = (row: StatusBoardLine): string =>
  row.line.name?.trim() || lineId(row)

const filterBySelection = (
  rows: readonly StatusBoardLine[],
  detailLineIds: readonly string[] | undefined
): StatusBoardLine[] => {
  if (!detailLineIds?.length) return [...rows]
  const wanted = new Set(detailLineIds)
  return rows.filter((row) => wanted.has(lineId(row)))
}

const padTiles = (
  tiles: StatusDisplayTile[],
  count: number
): StatusDisplayTile[] => {
  if (count <= 0) return []
  const next = tiles.slice(0, count)
  while (next.length < count) next.push({ kind: "empty" })
  return next
}

const announcementText = (row: StatusBoardLine): string =>
  row.announcements
    .map((announcement) => announcement.text.trim())
    .filter(Boolean)
    .join(" ")

const lineTile = (row: StatusBoardLine): StatusDisplayTile => ({
  kind: "line",
  lineId: lineId(row),
  name: lineName(row),
  modeName: row.line.modeName,
})

const otherGoodServiceCopy = (
  scope: StatusDetailScope,
  goodService: readonly StatusBoardLine[],
  detailLineIds: readonly string[] | undefined
): string | undefined => {
  if (scope !== "network" || !detailLineIds?.length) return undefined
  const selected = new Set(detailLineIds)
  const others = goodService.filter((row) => !selected.has(lineId(row)))
  return others.length > 0 ? GOOD_SERVICE_OTHER : undefined
}

const framesForLine = (
  row: StatusBoardLine,
  options: {
    phase: StatusDisplayPhase
    heading: string
    headingLineIds: readonly string[]
    bodyTiles: number
    charsPerTile: number
    otherGoodServiceCopy?: string
  }
): StatusDisplayFrame[] => {
  const id = lineId(row)
  const text = announcementText(row)
  const bodyTiles = options.bodyTiles

  if (bodyTiles <= 0) {
    return [
      {
        id: `${options.phase}:${id}:summary`,
        phase: options.phase,
        heading: options.heading,
        headingLineIds: options.headingLineIds,
        activeLineId: id,
        otherGoodServiceCopy: options.otherGoodServiceCopy,
        tiles: [],
      },
    ]
  }

  const identity = lineTile(row)
  const textSlots = Math.max(0, bodyTiles - 1)
  if (textSlots === 0 || !text) {
    return [
      {
        id: `${options.phase}:${id}`,
        phase: options.phase,
        heading: options.heading,
        headingLineIds: options.headingLineIds,
        activeLineId: id,
        otherGoodServiceCopy: options.otherGoodServiceCopy,
        tiles: padTiles([identity], bodyTiles),
      },
    ]
  }

  const chunks = splitTextFrames(text, options.charsPerTile * textSlots)
  const source = chunks.length > 0 ? chunks : [text]
  return source.map((chunk, index) => {
    const parts = splitTextFrames(chunk, options.charsPerTile)
    const textTiles: StatusDisplayTile[] = parts
      .slice(0, textSlots)
      .map((part) => ({ kind: "text" as const, text: part }))
    return {
      id: `${options.phase}:${id}:${index}`,
      phase: options.phase,
      heading: options.heading,
      headingLineIds: options.headingLineIds,
      activeLineId: id,
      otherGoodServiceCopy: options.otherGoodServiceCopy,
      tiles: padTiles([identity, ...textTiles], bodyTiles),
    }
  })
}

const goodServiceBodyFrames = (
  rows: readonly StatusBoardLine[],
  options: {
    headingLineIds: readonly string[]
    bodyTiles: number
    otherGoodServiceCopy?: string
  }
): StatusDisplayFrame[] => {
  if (options.bodyTiles <= 0) {
    return [
      {
        id: "good-service:summary",
        phase: "good-service",
        heading: "Good service",
        headingLineIds: options.headingLineIds,
        otherGoodServiceCopy: options.otherGoodServiceCopy,
        tiles: [],
      },
    ]
  }
  if (rows.length === 0) return []
  const frames: StatusDisplayFrame[] = []
  for (let start = 0; start < rows.length; start += options.bodyTiles) {
    const slice = rows.slice(start, start + options.bodyTiles)
    frames.push({
      id: `good-service:${slice.map(lineId).join(",")}`,
      phase: "good-service",
      heading: "Good service",
      headingLineIds: options.headingLineIds,
      activeLineId: lineId(slice[0]!),
      otherGoodServiceCopy: options.otherGoodServiceCopy,
      tiles: padTiles(slice.map(lineTile), options.bodyTiles),
    })
  }
  return frames
}

/**
 * Turn partitioned status sections into a fixed-height unattended sequence.
 * One tile is summary-only. N tiles = heading + N - 1 content tiles.
 */
export const buildStatusDisplayFrames = (
  sections: StatusBoardSections,
  options: StatusDisplayOptions
): StatusDisplayFrame[] => {
  const tiles = Math.max(1, Math.floor(options.tiles))
  const scope = options.detailScope ?? "network"
  const charsPerTile = options.charsPerTile ?? DEFAULT_CHARS_PER_TILE
  const bodyTiles = tiles - 1
  const detailIds = options.detailLineIds

  const disruptionSummary =
    scope === "selection"
      ? filterBySelection(sections.disruptions, detailIds)
      : sections.disruptions
  const goodSummary =
    scope === "selection"
      ? filterBySelection(sections.goodService, detailIds)
      : sections.goodService

  const disruptionDetail =
    scope === "network" || scope === "selection" || scope === "none"
      ? filterBySelection(sections.disruptions, detailIds)
      : sections.disruptions
  const goodDetail = filterBySelection(sections.goodService, detailIds)

  const disruptionHeadingIds =
    scope === "none" ? [] : disruptionSummary.map(lineId)
  const goodHeadingIds = scope === "none" ? [] : goodSummary.map(lineId)
  const otherCopy = otherGoodServiceCopy(scope, sections.goodService, detailIds)

  const disruptionFrames = disruptionDetail.flatMap((row) =>
    framesForLine(row, {
      phase: "disruptions",
      heading: scope === "none" ? lineName(row) : "Service disruptions",
      headingLineIds: disruptionHeadingIds,
      bodyTiles,
      charsPerTile,
      otherGoodServiceCopy: otherCopy,
    })
  )

  const goodFrames = goodServiceBodyFrames(goodDetail, {
    headingLineIds: goodHeadingIds,
    bodyTiles,
    otherGoodServiceCopy: otherCopy,
  })

  if (disruptionFrames.length === 0) return goodFrames
  if (goodFrames.length === 0) return disruptionFrames
  return [...disruptionFrames, ...goodFrames]
}

/**
 * Horizontal strip region allocation. Two units keep identity + reason.
 * Four or more units add both summary regions.
 */
/** Keep the active line visible when the title tile cannot show every chip. */
export const visibleHeadingChips = (
  lineIds: readonly string[],
  activeLineId: string | undefined,
  max = 4
): string[] => {
  if (lineIds.length <= max) return [...lineIds]
  if (!activeLineId) return lineIds.slice(0, max)
  const index = lineIds.indexOf(activeLineId)
  if (index < 0) return lineIds.slice(0, max)
  const start = Math.max(0, Math.min(index, lineIds.length - max))
  return lineIds.slice(start, start + max)
}

export const allocateStatusStripRegions = (
  units: number
): StatusStripAllocation => {
  const count = Math.max(1, Math.floor(units))
  if (count <= 2) {
    return {
      showDisruptedSummary: false,
      showOtherSummary: false,
      reasonUnits: count,
    }
  }
  if (count === 3) {
    return {
      showDisruptedSummary: true,
      showOtherSummary: false,
      reasonUnits: 2,
    }
  }
  return {
    showDisruptedSummary: true,
    showOtherSummary: true,
    reasonUnits: count - 2,
  }
}
