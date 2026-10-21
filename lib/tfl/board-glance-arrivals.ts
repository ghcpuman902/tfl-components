/**
 * Glance Board: flat next-departures prep for room-distance reading.
 * Few huge rows, not every line×bound group. Aspect-agnostic.
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

/** Default glance page: two trains on square / landscape. */
export const BOARD_GLANCE_PAGE_SIZE = 2
/** Tall containers can hold a third huge row. */
export const BOARD_GLANCE_TALL_PAGE_SIZE = 3
/** Cap how many next trains enter the rotate pool. */
export const BOARD_GLANCE_MAX_ROWS = 24
/**
 * Height/width of the glance shell at or above this uses the tall page size.
 * Same budget as `--glance-u` in globals.css: three rows (3 × 11.75u + 2u plus
 * the roundel tile and footer) fit at full width scale (4.5cqi) from ~1.6–1.9.
 * Phone portrait (~2.16) gets three rows; iPad portrait and short phones keep two.
 */
export const BOARD_GLANCE_TALL_ASPECT = 1.8

export const resolveGlanceArrivalsPageSize = (
  aspectHeightOverWidth?: number,
  override?: number
): number => {
  if (typeof override === "number" && override > 0) return override
  if (
    typeof aspectHeightOverWidth === "number" &&
    aspectHeightOverWidth >= BOARD_GLANCE_TALL_ASPECT
  ) {
    return BOARD_GLANCE_TALL_PAGE_SIZE
  }
  return BOARD_GLANCE_PAGE_SIZE
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
 * grouping — the glance board pages this flat list.
 */
export const prepareGlanceArrivals = ({
  data,
  now,
  maxRows = BOARD_GLANCE_MAX_ROWS,
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

/** Platform / bound meta for a glance row (e.g. "Westbound · Platform 1"). */
export const formatGlanceArrivalMeta = (
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

export type GlanceArrivalFrame = {
  id: string
  rows: readonly ArrivalsPreparedRow[]
}

/**
 * Chunk the flat next-train list into unattended frames.
 * When `pinFirst`, the soonest train stays on every frame and the rest rotate.
 */
export const buildGlanceArrivalFrames = (
  rows: readonly ArrivalsPreparedRow[],
  pageSize: number,
  options?: { pinFirst?: boolean }
): GlanceArrivalFrame[] => {
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
