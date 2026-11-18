/**
 * Live data for a short-link share card: the Board's first panel, read from
 * the same shared caches the Board polls. Any TfL failure falls back to the
 * static station card instead of failing the image.
 */

import type { RealtimePrediction } from "tfl-ts"
import { getDockCounts } from "@/components/tfl/cycle-hire/cycle-hire-dock-marker"
import {
  resolveBoardShareOg,
  type BoardShareOgModel,
} from "@/lib/og/board-share-og"
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

export const OG_LIVE_ROWS = 3

export type BoardShareOgDockRow = {
  name: string
  bikes: number
  eBikes: number
  spaces: number
  total: number
}

export type BoardShareOgArrivalRow = {
  lineId: string
  lineName: string
  destination: string
  minutes: number
}

export type BoardShareLiveOgModel = BoardShareOgModel & {
  live:
    | { kind: "cycle"; rows: BoardShareOgDockRow[] }
    | { kind: "rail" | "bus"; rows: BoardShareOgArrivalRow[] }
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

export const toArrivalRows = (
  arrivals: readonly RealtimePrediction[],
  keepLine: (lineId: string) => boolean = () => true
): BoardShareOgArrivalRow[] =>
  [...arrivals]
    .filter((a) => a.lineId && keepLine(a.lineId))
    .sort((a, b) => (a.timeToStation ?? 0) - (b.timeToStation ?? 0))
    .slice(0, OG_LIVE_ROWS)
    .map((a) => ({
      lineId: a.lineId ?? "",
      lineName: a.lineName ?? a.lineId ?? "",
      destination: (a.destinationName ?? a.towards ?? "").replace(
        / Underground Station$/,
        ""
      ),
      minutes: Math.max(0, Math.floor((a.timeToStation ?? 0) / 60)),
    }))

const londonClock = (date: Date): string =>
  new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/London",
  }).format(date)

const readLive = async (
  config: BoardConfig,
  lineIds: readonly string[]
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
    const state = await getCachedStopArrivalsState(config.stop)
    const wanted = new Set(config.arrivals.lineOrder ?? lineIds)
    const rows = toArrivalRows(
      state.arrivals,
      (id) => wanted.size === 0 || wanted.has(id)
    )
    return state.rateLimited || rows.length === 0
      ? null
      : { kind: "rail", rows }
  }
  if (first === "bus" && config.bus.stop && isBoardStopId(config.bus.stop)) {
    const state = await getCachedStopArrivalsState(config.bus.stop)
    const routes = new Set(config.bus.routes ?? [])
    const rows = toArrivalRows(
      state.arrivals,
      (id) => routes.size === 0 || routes.has(id)
    )
    return state.rateLimited || rows.length === 0 ? null : { kind: "bus", rows }
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
    const live = await readLive(
      config,
      base.lines.map((line) => line.id)
    )
    return { ...base, live, thenLines, at: live ? londonClock(now) : null }
  } catch {
    return { ...base, live: null, thenLines, at: null }
  }
}
