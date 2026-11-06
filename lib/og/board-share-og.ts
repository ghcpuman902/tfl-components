/**
 * Data for the /board/view share Open Graph card.
 * Static: station name + its lines. Never invents arrivals for another stop.
 */

import { getLineColor } from "tfl-ts/ui"
import { getLineNameTiers } from "@/lib/tfl/line-names"
import {
  getBoardStationLinesIndex,
  lookupBoardStationLines,
  type BoardStationLinesIndex,
} from "@/lib/tfl/board-station-lines"
import {
  getBoardStationNamesIndex,
  lookupBoardStationName,
  type BoardStationNamesIndex,
} from "@/lib/tfl/board-station-names"

export const BOARD_SHARE_OG_DEFAULT_STOP = "940GZZLUKSX"
export const BOARD_SHARE_OG_DEFAULT_NAME = "King's Cross St. Pancras"

export type BoardShareOgLine = {
  id: string
  name: string
  color: string
}

export type BoardShareOgModel = {
  stationName: string
  stopId: string | null
  lines: BoardShareOgLine[]
}

const lineColor = (lineId: string): string => {
  try {
    return getLineColor(lineId).hex
  } catch {
    return "#767676"
  }
}

const toOgLine = (lineId: string): BoardShareOgLine => ({
  id: lineId,
  name: getLineNameTiers(lineId).full,
  color: lineColor(lineId),
})

/** Prefer explicit a.lines order; otherwise the stop's serving lines. */
export const resolveBoardShareOgLines = (
  stopId: string | undefined,
  lineIds: readonly string[] | undefined,
  linesIndex: BoardStationLinesIndex = getBoardStationLinesIndex()
): BoardShareOgLine[] => {
  const explicit = (lineIds ?? []).map((id) => id.trim()).filter(Boolean)
  if (explicit.length > 0) return explicit.map(toOgLine)
  const membership = lookupBoardStationLines(linesIndex, stopId)
  if (!membership?.length) return []
  return membership.map((line) => toOgLine(line.lineId))
}

export const resolveBoardShareOg = ({
  stop,
  stopName,
  lineIds,
  namesIndex = getBoardStationNamesIndex(),
  linesIndex = getBoardStationLinesIndex(),
}: {
  stop?: string | null
  stopName?: string | null
  lineIds?: readonly string[] | null
  namesIndex?: BoardStationNamesIndex
  linesIndex?: BoardStationLinesIndex
}): BoardShareOgModel => {
  const stopId = stop?.trim() || null
  const named = stopName?.trim() || null
  const resolvedName =
    named ||
    (stopId ? lookupBoardStationName(namesIndex, stopId) : undefined) ||
    (stopId ? null : BOARD_SHARE_OG_DEFAULT_NAME)
  const effectiveStop =
    stopId ?? (resolvedName === BOARD_SHARE_OG_DEFAULT_NAME ? BOARD_SHARE_OG_DEFAULT_STOP : null)
  const stationName =
    resolvedName ||
    (effectiveStop
      ? lookupBoardStationName(namesIndex, effectiveStop)
      : undefined) ||
    BOARD_SHARE_OG_DEFAULT_NAME
  const lines = resolveBoardShareOgLines(
    effectiveStop ?? undefined,
    lineIds ?? undefined,
    linesIndex
  )
  return { stationName, stopId: effectiveStop, lines }
}
