/**
 * Board panel height hold. A panel's settled height is remembered per
 * source and width; while its first fetch is out, the panel holds that
 * height so arrivals land without moving the panels below.
 *
 * With nothing remembered yet, a bus or river panel cannot know its height
 * (one section per route), so the panels after it wait for it to settle
 * rather than paint and then get pushed down.
 */

import type { BoardPanelKind } from "@/lib/tfl/board-panels"

export const BOARD_PANEL_HEIGHTS_STORAGE_KEY = "tfl-board-panel-heights.v1"

/** Oldest entries drop first past this many. */
export const BOARD_PANEL_HEIGHTS_LIMIT = 40

export type BoardPanelHeights = Readonly<Record<string, number>>

/** Panels whose loaded height depends on how many routes the stop has. */
const ROUTE_SIZED_KINDS: ReadonlySet<BoardPanelKind> = new Set(["bus", "river"])

export const boardPanelHoldKey = (
  kind: BoardPanelKind,
  sourceId: string,
  width: number
): string => `${kind}:${sourceId}:${Math.round(width / 10) * 10}`

export const parseBoardPanelHeights = (value: unknown): BoardPanelHeights => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {}
  }
  const heights: Record<string, number> = {}
  for (const [key, height] of Object.entries(value)) {
    if (typeof height === "number" && Number.isFinite(height) && height > 0) {
      heights[key] = Math.round(height)
    }
  }
  return heights
}

/** Same object back when nothing changed, so callers can skip a write. */
export const rememberBoardPanelHeight = (
  heights: BoardPanelHeights,
  key: string,
  height: number
): BoardPanelHeights => {
  const rounded = Math.round(height)
  if (!(rounded > 0) || heights[key] === rounded) return heights
  const rest = Object.entries(heights).filter(([k]) => k !== key)
  const kept = rest.slice(Math.max(0, rest.length - (BOARD_PANEL_HEIGHTS_LIMIT - 1)))
  return Object.fromEntries([...kept, [key, rounded]])
}

export type BoardPanelHoldInput = {
  kind: BoardPanelKind
  /** First fetch out, nothing to show yet. */
  pending: boolean
  /** Remembered settled height, if any. */
  held: number | undefined
}

export type BoardPanelHoldPlan = {
  kind: BoardPanelKind
  /** Hold this height while pending. */
  minHeight: number | undefined
  /** Wait: an earlier route-sized panel has no height to hold yet. */
  waiting: boolean
}

/** Panels in board order (top to bottom at one column). */
export const planBoardPanelHold = (
  panels: readonly BoardPanelHoldInput[]
): BoardPanelHoldPlan[] => {
  let blocked = false
  return panels.map(({ kind, pending, held }) => {
    const plan: BoardPanelHoldPlan = {
      kind,
      minHeight: pending ? held : undefined,
      waiting: blocked,
    }
    if (pending && held === undefined && ROUTE_SIZED_KINDS.has(kind)) {
      blocked = true
    }
    return plan
  })
}
