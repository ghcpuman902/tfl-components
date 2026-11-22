/**
 * Pure row builders for the live share card (`/b/<slug>/og`). No fetches, so
 * they test without TfL or Next caches. `board-share-live-og.ts` wires them.
 */

import type { RealtimePrediction } from "tfl-ts"
import { getStatusKind, getWorstCurrentStatus } from "tfl-ts"
import { toOgLine, type BoardShareOgLine } from "@/lib/og/board-share-og"
import {
  formatBoundHeading,
  isUnknownArrivalsPlatform,
  parseArrivalsPlatformLabel,
  parseArrivalsRailDesignation,
  parseCompassBoundId,
} from "@/lib/tfl/arrivals-bound-sort"
import type { GlancePriorityItem } from "@/lib/tfl/board-settings"
import {
  resolveBusStopLetter,
  usableTflText,
} from "@/lib/tfl/bus-stop-letter"
import type { StatusLine } from "@/lib/tfl/status-types"

/** Arrival rows on A and C, like a Board bound's first rows. */
export const OG_LIVE_ROWS = 3
/** Max detailed status rows on B (alerts preferred); rest become compact chips. */
export const OG_STATUS_DETAIL = 3
/** @deprecated Prefer OG_STATUS_DETAIL; kept for callers that still slice. */
export const OG_STATUS_ROWS = 5

export type BoardShareOgTimeRow = { destination: string; minutes: number }

export type BoardShareOgBusRow = BoardShareOgTimeRow & { route: string }

export type BoardShareOgStatusRow = BoardShareOgLine & {
  statusText: string
  tone: "ok" | "alert"
}

export type BoardShareOgNextTrain = BoardShareOgTimeRow & {
  line: BoardShareOgLine
}

/** A: one line, one bound, next three trains. */
export type BoardShareOgRailArrivals = {
  kind: "rail-arrivals"
  line: BoardShareOgLine
  /** `Westbound · Platform 1`, as the Board's bound heading. */
  direction: string | null
  rows: BoardShareOgTimeRow[]
  /** Other lines at the stop, in Board order. */
  alsoHere: BoardShareOgLine[]
}

/** B: line status for the stop's lines, plus one next train when known. */
export type BoardShareOgRailStatus = {
  kind: "rail-status"
  /** Detailed rows with status text (alerts first). */
  rows: BoardShareOgStatusRow[]
  /** Remaining lines as compact chips — status via opacity, no right-hand text. */
  chips: BoardShareOgStatusRow[]
  next: BoardShareOgNextTrain | null
}

/** C: next buses at one stop. */
export type BoardShareOgBus = {
  kind: "bus"
  stopName: string
  /** Painted stop letter for StopLetterBadge; null when TfL has none. */
  stopLetter: string | null
  rows: BoardShareOgBusRow[]
}

const STATION_SUFFIX_RE = / (?:Underground|DLR|Rail) Station$/

export const arrivalDestination = (a: RealtimePrediction): string =>
  (usableTflText(a.destinationName) ?? usableTflText(a.towards) ?? "").replace(
    STATION_SUFFIX_RE,
    ""
  )

export const arrivalMinutes = (a: RealtimePrediction): number =>
  Math.max(0, Math.floor((a.timeToStation ?? 0) / 60))

const byTime = (a: RealtimePrediction, b: RealtimePrediction): number =>
  (a.timeToStation ?? 0) - (b.timeToStation ?? 0)

const toTimeRow = (a: RealtimePrediction): BoardShareOgTimeRow => ({
  destination: arrivalDestination(a),
  minutes: arrivalMinutes(a),
})

/** Bound + platform key, the same split the Board's bound headings use. */
const boundKey = (platformName?: string): string => {
  if (isUnknownArrivalsPlatform(platformName)) return "unknown"
  const bound =
    parseCompassBoundId(platformName) ??
    parseArrivalsRailDesignation(platformName) ??
    ""
  return `${bound}|${parseArrivalsPlatformLabel(platformName) ?? ""}`
}

export const boundHeadingFor = (platformName?: string): string | null =>
  formatBoundHeading({
    boundId: parseCompassBoundId(platformName),
    railDesignation: parseArrivalsRailDesignation(platformName),
    platformLabel: parseArrivalsPlatformLabel(platformName),
    unknown: isUnknownArrivalsPlatform(platformName),
  })

const matchesPriorityBound = (
  platformName: string | undefined,
  bound: string
): boolean => {
  if (bound.startsWith("platform-")) {
    return (
      parseArrivalsPlatformLabel(platformName)?.toLowerCase() ===
      bound.slice("platform-".length)
    )
  }
  return (
    parseCompassBoundId(platformName) === bound ||
    parseArrivalsRailDesignation(platformName) === bound
  )
}

/**
 * A: pick the line and bound the Board leads with. Priority first (`a.priority`),
 * else the first line in Board order with a train, then that line's soonest
 * bound + platform. Returns null when no wanted line has a prediction.
 */
export const pickRailArrivals = (
  arrivals: readonly RealtimePrediction[],
  {
    lineIds,
    priority,
  }: {
    /** Board line order (`a.lines`, else the stop's serving lines). */
    lineIds: readonly string[]
    priority?: readonly GlancePriorityItem[]
  }
): BoardShareOgRailArrivals | null => {
  const wanted = new Set(lineIds)
  const usable = arrivals
    .filter((a) => a.lineId && (wanted.size === 0 || wanted.has(a.lineId)))
    .sort(byTime)
  if (usable.length === 0) return null

  const lead = priority?.find((item) =>
    usable.some((a) => a.lineId === item.line)
  )
  const lineId =
    lead?.line ??
    lineIds.find((id) => usable.some((a) => a.lineId === id)) ??
    usable[0].lineId ??
    ""
  const onLine = usable.filter((a) => a.lineId === lineId)
  const leadBound = lead?.bound
  const first =
    (leadBound
      ? onLine.find((a) => matchesPriorityBound(a.platformName, leadBound))
      : undefined) ?? onLine[0]
  const key = boundKey(first.platformName)
  const rows = onLine
    .filter((a) => boundKey(a.platformName) === key)
    .slice(0, OG_LIVE_ROWS)
    .map(toTimeRow)

  const order = lineIds.length > 0 ? lineIds : [lineId]
  return {
    kind: "rail-arrivals",
    line: toOgLine(lineId),
    direction: boundHeadingFor(first.platformName),
    rows,
    alsoHere: order.filter((id) => id !== lineId).map(toOgLine),
  }
}

/** `Good Service` → `Good service`, as the mockup and Board status rows read. */
const sentenceCase = (text: string): string =>
  text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()

/**
 * B: one status row per stop line, in Board order. Lines TfL did not return
 * are dropped rather than guessed as good service.
 */
export const toStatusRows = (
  statuses: readonly StatusLine[],
  lineIds: readonly string[],
  now?: number
): BoardShareOgStatusRow[] => {
  const byId = new Map(statuses.map((line) => [line.id ?? "", line]))
  const statusNow = now !== undefined ? { now } : undefined
  return lineIds.flatMap((id) => {
    const line = byId.get(id)
    if (!line) return []
    const worst = getWorstCurrentStatus(line.lineStatuses ?? [], statusNow)
    const good = !worst || getStatusKind(worst) === "good"
    const text = usableTflText(worst?.statusSeverityDescription)
    return [
      {
        ...toOgLine(id),
        statusText: text ? sentenceCase(text) : "Good service",
        tone: good ? "ok" : "alert",
      },
    ]
  })
}

/**
 * B layout: disruptions get detailed rows (status text); remaining lines
 * become compact chips — mirrors tube-status-board (disruptions then good
 * service) and tube-status-strip compact LineBadge chips.
 */
export const splitStatusForOg = (
  rows: readonly BoardShareOgStatusRow[]
): {
  detail: BoardShareOgStatusRow[]
  chips: BoardShareOgStatusRow[]
} => {
  const alerts = rows.filter((r) => r.tone === "alert")
  const oks = rows.filter((r) => r.tone === "ok")
  const detail: BoardShareOgStatusRow[] = []
  for (const r of alerts) {
    if (detail.length < OG_STATUS_DETAIL) detail.push(r)
  }
  // No disruptions: keep a couple of ok rows detailed so B isn't chips-only.
  if (detail.length === 0) {
    for (const r of oks) {
      if (detail.length < 2) detail.push(r)
    }
  }
  const inDetail = new Set(detail.map((r) => r.id))
  return { detail, chips: rows.filter((r) => !inDetail.has(r.id)) }
}

/** B: the soonest train at the stop, preferring the Board's lines. */
export const pickNextTrain = (
  arrivals: readonly RealtimePrediction[],
  lineIds: readonly string[]
): BoardShareOgNextTrain | null => {
  const wanted = new Set(lineIds)
  const sorted = arrivals.filter((a) => a.lineId).sort(byTime)
  const next =
    sorted.find((a) => wanted.has(a.lineId ?? "")) ?? sorted[0] ?? null
  if (!next?.lineId) return null
  return { line: toOgLine(next.lineId), ...toTimeRow(next) }
}

/** C: next buses on the Board's routes, titled with the painted stop letter. */
export const toBusLive = (
  arrivals: readonly RealtimePrediction[],
  {
    routes,
    fallbackName,
  }: { routes: readonly string[]; fallbackName: string }
): BoardShareOgBus | null => {
  const wanted = new Set(routes)
  const usable = arrivals
    .filter((a) => a.lineId && (wanted.size === 0 || wanted.has(a.lineId)))
    .sort(byTime)
  if (usable.length === 0) return null
  const name =
    usable.map((a) => usableTflText(a.stationName)).find(Boolean) ??
    fallbackName
  const letter = resolveBusStopLetter(
    undefined,
    usable.map((a) => ({ platformName: a.platformName }))
  )
  return {
    kind: "bus",
    stopName: name,
    stopLetter: letter,
    rows: usable.slice(0, OG_LIVE_ROWS).map((a) => ({
      route: usableTflText(a.lineName) ?? a.lineId ?? "",
      ...toTimeRow(a),
    })),
  }
}
