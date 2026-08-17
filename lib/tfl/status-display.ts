import { splitTextFrames } from "@/lib/tfl/unattended-sequence"
import type { StatusBoardLine, StatusBoardSections } from "@/lib/tfl/status-board"
import type { LineAnnouncement } from "@/lib/tfl/status-reason"

export type StatusDisplayPhase = "disruptions" | "good-service"
export type StatusDetailScope = "network" | "selection" | "none"

export type StatusDisplayAnnouncement = Pick<
  LineAnnouncement,
  "text" | "statusSeverityDescription"
>

export type StatusDisplayTile =
  | {
      kind: "announcements"
      items: readonly StatusDisplayAnnouncement[]
      quiet?: boolean
    }
  | { kind: "chips"; lineIds: readonly string[] }
  | { kind: "empty" }

export type StatusDisplayFrame = {
  id: string
  phase: StatusDisplayPhase
  heading: string
  headingLineIds: readonly string[]
  bodyHeading?: string
  activeLineId?: string
  activeLineName?: string
  activeModeName?: string
  otherGoodServiceCopy?: string
  pageIndex?: number
  pageCount?: number
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

const DEFAULT_CHARS_PER_TILE = 200
const GOOD_SERVICE_OTHER = "Good service on all other lines"
const LINES_PER_TILE = 2

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

const toDisplayAnnouncements = (
  announcement: LineAnnouncement
): StatusDisplayAnnouncement[] => {
  const paragraphs = announcement.text
    .split(/\n+/)
    .map((part) => part.trim())
    .filter(Boolean)
  const source = paragraphs.length > 0 ? paragraphs : [announcement.text]
  return source.map((text, index) => ({
    text,
    statusSeverityDescription:
      index === 0 ? announcement.statusSeverityDescription : undefined,
  }))
}

const announcementBody = (item: StatusDisplayAnnouncement): string => {
  const label = item.statusSeverityDescription?.trim()
  const body = item.text.trim()
  if (label && body.toLowerCase() === label.toLowerCase()) return ""
  return body
}

const estimateAnnouncementLines = (
  item: StatusDisplayAnnouncement,
  charsPerLine: number
): number => {
  const label = item.statusSeverityDescription?.trim()
  const reserved = label ? label.length + 1 : 0
  const chars = reserved + announcementBody(item).length
  if (chars <= 0) return label ? 1 : 0
  return Math.max(1, Math.ceil(chars / Math.max(1, charsPerLine)))
}

const splitAnnouncement = (
  item: StatusDisplayAnnouncement,
  pageChars: number
): StatusDisplayAnnouncement[] => {
  const body = announcementBody(item)
  if (!body) return [item]
  const chunks = splitTextFrames(body, pageChars)
  if (chunks.length <= 1) return [item]
  return chunks.map((chunk, index) => ({
    text: chunk,
    statusSeverityDescription:
      index === 0 ? item.statusSeverityDescription : undefined,
  }))
}

/**
 * Stack every chip+copy block on one page when each block fits on its own.
 * Only split a single block that is longer than the body by itself.
 */
export const packAnnouncementPages = (
  items: readonly StatusDisplayAnnouncement[],
  options: { linesPerPage: number; charsPerLine: number }
): StatusDisplayAnnouncement[][] => {
  if (items.length === 0) return []
  const linesPerPage = Math.max(1, options.linesPerPage)
  const charsPerLine = Math.max(1, options.charsPerLine)
  const pageChars = linesPerPage * charsPerLine
  const fitsAlone = (item: StatusDisplayAnnouncement) =>
    estimateAnnouncementLines(item, charsPerLine) <= linesPerPage

  if (items.every(fitsAlone)) return [[...items]]

  const pages: StatusDisplayAnnouncement[][] = []
  let current: StatusDisplayAnnouncement[] = []
  let used = 0

  const flush = () => {
    if (current.length === 0) return
    pages.push(current)
    current = []
    used = 0
  }

  for (const item of items) {
    const lines = estimateAnnouncementLines(item, charsPerLine)
    if (!fitsAlone(item)) {
      flush()
      for (const piece of splitAnnouncement(item, pageChars)) {
        pages.push([piece])
      }
      continue
    }
    if (current.length > 0 && used + lines > linesPerPage) {
      flush()
    }
    current.push(item)
    used += lines
  }
  flush()
  return pages.length > 0 ? pages : [[...items]]
}

export const statusDisplayReasonText = (
  tiles: readonly StatusDisplayTile[]
): string =>
  tiles
    .flatMap((tile) => {
      if (tile.kind !== "announcements") return []
      return tile.items.map(
        (item) =>
          announcementBody(item) ||
          item.statusSeverityDescription?.trim() ||
          item.text.trim()
      )
    })
    .filter(Boolean)
    .join(" ")

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
  const items = row.announcements.flatMap(toDisplayAnnouncements)
  const bodyTiles = options.bodyTiles
  const identity = {
    activeLineId: id,
    activeLineName: lineName(row),
    activeModeName: row.line.modeName,
  }
  const quiet = row.kind === "closed"

  if (bodyTiles <= 0) {
    return [
      {
        id: `${options.phase}:${id}:summary`,
        phase: options.phase,
        heading: options.heading,
        headingLineIds: options.headingLineIds,
        ...identity,
        otherGoodServiceCopy: options.otherGoodServiceCopy,
        pageIndex: 0,
        pageCount: 1,
        tiles: [],
      },
    ]
  }

  const pages = packAnnouncementPages(items, {
    linesPerPage: bodyTiles * LINES_PER_TILE,
    charsPerLine: Math.max(1, Math.round(options.charsPerTile / LINES_PER_TILE)),
  })
  const source = pages.length > 0 ? pages : [[]]

  return source.map((pageItems, index) => ({
    id: `${options.phase}:${id}:${index}`,
    phase: options.phase,
    heading: options.heading,
    headingLineIds: options.headingLineIds,
    ...identity,
    otherGoodServiceCopy:
      index === source.length - 1 ? options.otherGoodServiceCopy : undefined,
    pageIndex: index,
    pageCount: source.length,
    tiles:
      pageItems.length > 0
        ? [{ kind: "announcements" as const, items: pageItems, quiet }]
        : [],
  }))
}

const goodServiceBodyFrames = (
  rows: readonly StatusBoardLine[],
  options: {
    disruptionLineIds: readonly string[]
    bodyTiles: number
    otherGoodServiceCopy?: string
  }
): StatusDisplayFrame[] => {
  if (rows.length === 0) return []
  const lineIds = rows.map(lineId)
  const keepDisruptions = options.disruptionLineIds.length > 0
  return [
    {
      id: `good-service:${lineIds.join(",")}`,
      phase: "good-service",
      heading: keepDisruptions ? "Service disruptions" : "Good service",
      headingLineIds: keepDisruptions ? options.disruptionLineIds : [],
      bodyHeading: keepDisruptions ? "Good service" : undefined,
      otherGoodServiceCopy: options.otherGoodServiceCopy,
      pageIndex: 0,
      pageCount: 1,
      tiles:
        options.bodyTiles > 0
          ? [{ kind: "chips", lineIds }]
          : [],
    },
  ]
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
  const disruptionDetail =
    scope === "network" || scope === "selection" || scope === "none"
      ? filterBySelection(sections.disruptions, detailIds)
      : sections.disruptions
  const goodDetail = filterBySelection(sections.goodService, detailIds)

  const disruptionHeadingIds =
    scope === "none" ? [] : disruptionSummary.map(lineId)
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
    disruptionLineIds: disruptionHeadingIds,
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
