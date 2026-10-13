/**
 * Square wall Board (HomeView-class): flat next-departures prep.
 * Few huge rows, not every line×bound group.
 */

import type { RealtimePrediction } from "tfl-ts"
import {
  formatBoundHeading,
  parseArrivalsPlatformLabel,
  parseArrivalsRailDesignation,
  parseCompassBoundId,
} from "@/lib/tfl/arrivals-bound-sort"
import {
  indexArrivals,
  isExpiredArrivalPrediction,
  type ArrivalsPreparedRow,
} from "@/lib/tfl/arrivals-prepare"
import { chunkWithFinalBackfill } from "@/lib/tfl/arrivals-unattended-frames"

/** Far density: two glanceable trains. */
export const BOARD_SQUARE_FAR_PAGE_SIZE = 2
/** Default square density: three trains. */
export const BOARD_SQUARE_PAGE_SIZE = 3
/** Cap how many next trains enter the rotate pool. */
export const BOARD_SQUARE_MAX_ROWS = 24

export const resolveSquareArrivalsPageSize = (
  densityFar: boolean,
  override?: number
): number => {
  if (typeof override === "number" && override > 0) return override
  return densityFar ? BOARD_SQUARE_FAR_PAGE_SIZE : BOARD_SQUARE_PAGE_SIZE
}

const arrivalIdentityKey = (arrival: RealtimePrediction, index: number) => {
  const parts = [
    arrival.naptanId?.trim() ?? "",
    arrival.lineId?.trim() ?? "",
    arrival.direction?.trim() ?? "",
    arrival.platformName?.trim() ?? "",
    arrival.tripId?.trim() ?? "",
    arrival.vehicleId?.trim() ?? "",
    arrival.destinationNaptanId?.trim() ?? "",
    arrival.id?.trim() ?? "",
    arrival.expectedArrival?.trim() ?? "",
  ]
  const base = parts.join("|")
  return base.replace(/\|+/g, "|").replace(/^\||\|$/g, "") || `row-${index}`
}

/**
 * Sort all predictions by time-to-station (soonest first). No line/bound
 * grouping — the square board pages this flat list.
 */
export const prepareSquareArrivals = ({
  data,
  now,
  maxRows = BOARD_SQUARE_MAX_ROWS,
}: {
  data: readonly RealtimePrediction[]
  now?: number
  maxRows?: number
}): ArrivalsPreparedRow[] => {
  const indexed = indexArrivals(data).filter(
    (item) =>
      now === undefined || !isExpiredArrivalPrediction(item.arrival, now)
  )
  indexed.sort((a, b) => {
    const ta = a.arrival.timeToStation ?? Number.POSITIVE_INFINITY
    const tb = b.arrival.timeToStation ?? Number.POSITIVE_INFINITY
    if (ta !== tb) return ta - tb
    return a.sourceIndex - b.sourceIndex
  })
  return indexed.slice(0, maxRows).map((item, index) => ({
    key: arrivalIdentityKey(item.arrival, index),
    arrival: item.arrival,
    sourceIndex: item.sourceIndex,
  }))
}

/** Platform / bound meta for a square row (e.g. "Westbound · Platform 1"). */
export const formatSquareArrivalMeta = (
  platformName?: string
): string | null => {
  const boundId = parseCompassBoundId(platformName)
  const platformLabel = parseArrivalsPlatformLabel(platformName)
  const railDesignation = parseArrivalsRailDesignation(platformName)
  return formatBoundHeading({
    boundId,
    platformLabel,
    railDesignation,
    unknown: Boolean(platformName && /\bunknown\b/i.test(platformName)),
  })
}

export type SquareArrivalFrame = {
  id: string
  rows: readonly ArrivalsPreparedRow[]
}

/**
 * Chunk the flat next-train list into unattended frames.
 * When `pinFirst`, the soonest train stays on every frame and the rest rotate.
 */
export const buildSquareArrivalFrames = (
  rows: readonly ArrivalsPreparedRow[],
  pageSize: number,
  options?: { pinFirst?: boolean }
): SquareArrivalFrame[] => {
  if (pageSize <= 0) {
    return rows.length
      ? [{ id: rows.map((r) => r.key).join("|"), rows: [...rows] }]
      : []
  }
  if (rows.length === 0) return []

  const pinFirst = options?.pinFirst !== false
  if (!pinFirst || pageSize === 1 || rows.length <= pageSize) {
    return chunkWithFinalBackfill(rows, pageSize).map((chunk) => ({
      id: chunk.map((r) => r.key).join("|"),
      rows: chunk,
    }))
  }

  const [first, ...rest] = rows
  if (!first) return []
  const windowSize = pageSize - 1
  const windows = chunkWithFinalBackfill(rest, windowSize)
  return windows.map((chunk) => {
    const frameRows = [first, ...chunk]
    return {
      id: frameRows.map((r) => r.key).join("|"),
      rows: frameRows,
    }
  })
}
