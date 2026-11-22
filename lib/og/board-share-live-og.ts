/**
 * Live data for a short-link share card: the Board's first panel, read from
 * the same shared caches the Board polls.
 *
 * - rail with trains → A (`rail-arrivals`)
 * - rail without trains → B (`rail-status`, line status + one next train)
 * - bus → C (`bus`)
 * - cycle → dock rows
 *
 * Anything else, or a TfL failure with nothing to show, falls back to the
 * static station card instead of failing the image.
 */

import type { RealtimePrediction } from "tfl-ts"
import { getDockCounts } from "@/components/tfl/cycle-hire/cycle-hire-dock-marker"
import {
  resolveBoardShareOg,
  type BoardShareOgModel,
} from "@/lib/og/board-share-og"
import {
  OG_LIVE_ROWS,
  pickNextTrain,
  pickRailArrivals,
  toBusLive,
  toStatusRows,
  type BoardShareOgBus,
  type BoardShareOgRailArrivals,
  type BoardShareOgRailStatus,
} from "@/lib/og/board-share-live-og-rows"
import {
  BOARD_LIVE_DOCK_LIMIT,
  isBoardBikePointId,
  isBoardStopId,
} from "@/lib/tfl/board-live-ids"
import { resolveBoardSlots } from "@/lib/tfl/board-panels"
import { getCachedStopArrivalsState } from "@/lib/tfl/cached-stop-arrivals"
import { getCachedBikePointsState } from "@/lib/tfl/cycle-hire-data"
import type { CycleHireDock } from "@/lib/tfl/cycle-hire-types"
import type { BoardConfig } from "@/lib/tfl/board-url-state"
import { getCachedLineStatuses } from "@/lib/tfl/status-data"

export { OG_LIVE_ROWS }
export type {
  BoardShareOgBus,
  BoardShareOgBusRow,
  BoardShareOgNextTrain,
  BoardShareOgRailArrivals,
  BoardShareOgRailStatus,
  BoardShareOgStatusRow,
  BoardShareOgTimeRow,
} from "@/lib/og/board-share-live-og-rows"

export type BoardShareOgDockRow = {
  name: string
  bikes: number
  eBikes: number
  spaces: number
  total: number
}

export type BoardShareOgCycle = { kind: "cycle"; rows: BoardShareOgDockRow[] }

export type BoardShareLiveOgModel = BoardShareOgModel & {
  live:
    | BoardShareOgRailArrivals
    | BoardShareOgRailStatus
    | BoardShareOgBus
    | BoardShareOgCycle
    | null
  /** Rail lines listed under a cycle panel when the Board also shows rail. */
  thenLines: BoardShareOgModel["lines"]
  /** London clock time of the read, e.g. "12:04". */
  at: string | null
}

/** "Birkenhead Street, King's Cross" reads as "Birkenhead Street". */
export const shortDockName = (name: string): string =>
  name.split(",")[0]?.trim() || name

export const toDockRow = (dock: CycleHireDock): BoardShareOgDockRow => {
  const counts = getDockCounts(dock)
  return {
    name: shortDockName(dock.name),
    bikes: counts.standardBikes,
    eBikes: counts.eBikes,
    spaces: counts.emptyDocks,
    total: counts.totalDocks,
  }
}

const londonClock = (date: Date): string =>
  new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/London",
  }).format(date)

/** Arrivals for a stop, or none on rate limit / TfL error (B still renders). */
const softArrivals = async (stop: string): Promise<RealtimePrediction[]> => {
  try {
    const state = await getCachedStopArrivalsState(stop)
    return state.rateLimited ? [] : state.arrivals
  } catch {
    return []
  }
}

const readRail = async (
  config: BoardConfig,
  stop: string,
  lineIds: readonly string[]
): Promise<BoardShareOgRailArrivals | BoardShareOgRailStatus | null> => {
  const arrivals = await softArrivals(stop)
  const a = pickRailArrivals(arrivals, {
    lineIds,
    priority: config.arrivals.priority,
  })
  if (a) return a
  if (lineIds.length === 0) return null
  const status = await getCachedLineStatuses(lineIds)
  const rows = toStatusRows(status.data, lineIds, status.fetchedAt)
  if (rows.length === 0) return null
  return {
    kind: "rail-status",
    rows,
    next: pickNextTrain(arrivals, lineIds),
  }
}

const readLive = async (
  config: BoardConfig,
  base: BoardShareOgModel
): Promise<BoardShareLiveOgModel["live"]> => {
  const first = resolveBoardSlots(config.slots.p1, config.slots.p2).p1[0]
  if (first === "cycle") {
    const ids = (config.cycle.docks ?? [])
      .filter(isBoardBikePointId)
      .slice(0, BOARD_LIVE_DOCK_LIMIT)
    if (ids.length === 0) return null
    const state = await getCachedBikePointsState(ids)
    if (state.rateLimited || state.docks.length === 0) return null
    return {
      kind: "cycle",
      rows: state.docks.slice(0, OG_LIVE_ROWS).map(toDockRow),
    }
  }
  if (first === "rail" && config.stop && isBoardStopId(config.stop)) {
    return readRail(
      config,
      config.stop,
      base.lines.map((line) => line.id)
    )
  }
  if (first === "bus" && config.bus.stop && isBoardStopId(config.bus.stop)) {
    const state = await getCachedStopArrivalsState(config.bus.stop)
    if (state.rateLimited) return null
    return toBusLive(state.arrivals, {
      routes: config.bus.routes ?? [],
      fallbackName: base.stationName,
    })
  }
  return null
}

export const resolveBoardShareLiveOg = async (
  config: BoardConfig,
  now: Date = new Date()
): Promise<BoardShareLiveOgModel> => {
  const base = resolveBoardShareOg({
    stop: config.stop,
    stopName: config.stopName,
    lineIds: config.arrivals.lineOrder,
  })
  const slots = resolveBoardSlots(config.slots.p1, config.slots.p2)
  const showsRail = [...slots.p1, ...slots.p2].includes("rail")
  const thenLines = showsRail ? base.lines : []
  try {
    const live = await readLive(config, base)
    return { ...base, live, thenLines, at: live ? londonClock(now) : null }
  } catch {
    return { ...base, live: null, thenLines, at: null }
  }
}
