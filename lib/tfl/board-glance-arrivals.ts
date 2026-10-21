/**
 * Glance Board: room-distance next departures. Predictions group by
 * line + direction into fixed positions (board priority, then line order,
 * then canonical line and bound order — never by time). The first group is
 * the anchor (or a pinned one); a "pair" board shows the first two as equals;
 * the rest are quarter tiles that scroll (touch) or pan (unattended).
 */

import type {
  PredictionWithSharedTrackIdentity,
  RealtimePrediction,
} from "tfl-ts"
import {
  ARRIVALS_BOUND_IDS,
  compareArrivalsBounds,
  formatBoundHeading,
  isUnknownArrivalsPlatform,
  parseArrivalsPlatformLabel,
  parseArrivalsRailDesignation,
  parseCompassBoundId,
} from "@/lib/tfl/arrivals-bound-sort"
import {
  indexArrivals,
  isExpiredArrivalPrediction,
  type ArrivalsPreparedRow,
} from "@/lib/tfl/arrivals-prepare"
import { compareArrivalsLines } from "@/lib/tfl/arrivals-line-sort"
import { getLineNameTiers } from "@/lib/tfl/line-names"
import type { GlancePriorityItem } from "@/lib/tfl/board-settings"

export {
  parseGlancePriorityItem,
  serializeGlancePriorityItem,
  type GlancePriorityItem,
} from "@/lib/tfl/board-settings"

/** Cap how many predictions enter the glance grouping. */
export const BOARD_GLANCE_MAX_ROWS = 48

/** Unattended overflow: hold each column of tiles, then pan one column. */
export const GLANCE_PAN_HOLD_MS = 10_000
export const GLANCE_PAN_MOVE_MS = 1_600

/** Whole tiles the anchor and pair layouts show at once (2 × 2, or 1 × 4 under a landscape pair). */
export const GLANCE_VISIBLE_TILES = 4
/** Tile rows the strip can use; clones are padded to whole columns of the larger. */
export const GLANCE_MAX_TILE_ROWS = 2

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

/** All live predictions by time-to-station (soonest first), before grouping. */
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

/** Line identity a glance group keys on: the exclusive shared-track line, else every shared line, else the raw line. */
export const glanceLineKey = (arrival: RealtimePrediction): string => {
  const tagged = arrival as PredictionWithSharedTrackIdentity
  const identity = tagged.sharedTrackIdentity
  if (identity?.confidence === "exclusive-segment") {
    const canonical = identity.canonicalLineId.trim()
    if (canonical) return canonical.toLowerCase()
  }
  if (identity?.confidence === "ambiguous" && identity.rawLineIds.length >= 2) {
    return [...identity.rawLineIds]
      .map((id) => id.trim().toLowerCase())
      .filter(Boolean)
      .sort()
      .join("+")
  }
  return arrival.lineId?.trim().toLowerCase() || "unknown"
}

/** Direction a glance group keys on: compass bound, Inner / Outer Rail, else the platform, else unknown. */
export const glanceBoundKey = (platformName?: string): string => {
  const compass = parseCompassBoundId(platformName)
  if (compass) return compass
  const rail = parseArrivalsRailDesignation(platformName)
  if (rail) return rail
  const platform = parseArrivalsPlatformLabel(platformName)
  if (platform) return `platform-${platform.toLowerCase()}`
  return "unknown"
}

export type GlanceGroup = {
  /** `line:bound`, e.g. `victoria:northbound`. Stable across polls. */
  key: string
  lineKey: string
  boundKey: string
  /** Soonest first; never empty. */
  rows: readonly ArrivalsPreparedRow[]
}

const priorityRank = (
  group: Pick<GlanceGroup, "lineKey" | "boundKey">,
  priority: readonly GlancePriorityItem[]
): number => {
  const index = priority.findIndex(
    (item) =>
      item.line === group.lineKey &&
      (item.bound === undefined || item.bound === group.boundKey)
  )
  return index === -1 ? Number.POSITIVE_INFINITY : index
}

const lineOrderRank = (lineKey: string, lineOrder: readonly string[]) => {
  const index = lineOrder.findIndex((id) => id.trim().toLowerCase() === lineKey)
  return index === -1 ? Number.POSITIVE_INFINITY : index
}

const lineName = (lineKey: string) =>
  lineKey.includes("+") ? lineKey : getLineNameTiers(lineKey).full

const boundOrder = (boundKey: string): string | null =>
  ARRIVALS_BOUND_IDS.includes(boundKey as (typeof ARRIVALS_BOUND_IDS)[number])
    ? boundKey
    : null

/** Fixed position order: priority, then `a.lines`, then canonical line, then bound. Times never reorder groups. */
export const compareGlanceGroups = (
  a: Pick<GlanceGroup, "key" | "lineKey" | "boundKey">,
  b: Pick<GlanceGroup, "key" | "lineKey" | "boundKey">,
  priority: readonly GlancePriorityItem[] = [],
  lineOrder: readonly string[] = []
): number => {
  const byPriority = priorityRank(a, priority) - priorityRank(b, priority)
  if (byPriority !== 0 && !Number.isNaN(byPriority)) return byPriority
  const byLineOrder =
    lineOrderRank(a.lineKey, lineOrder) - lineOrderRank(b.lineKey, lineOrder)
  if (byLineOrder !== 0 && !Number.isNaN(byLineOrder)) return byLineOrder
  if (a.lineKey !== b.lineKey) {
    const byLine = compareArrivalsLines(
      { lineId: a.lineKey, lineName: lineName(a.lineKey) },
      { lineId: b.lineKey, lineName: lineName(b.lineKey) }
    )
    if (byLine !== 0) return byLine
  }
  const byBound = compareArrivalsBounds(
    boundOrder(a.boundKey),
    boundOrder(b.boundKey)
  )
  if (byBound !== 0) return byBound
  return a.key.localeCompare(b.key)
}

/** Group soonest-first rows by line + direction, in fixed position order. */
export const groupGlanceArrivals = (
  rows: readonly ArrivalsPreparedRow[],
  options: {
    priority?: readonly GlancePriorityItem[]
    lineOrder?: readonly string[]
  } = {}
): GlanceGroup[] => {
  const groups = new Map<
    string,
    { lineKey: string; boundKey: string; rows: ArrivalsPreparedRow[] }
  >()
  for (const row of rows) {
    const lineKey = glanceLineKey(row.arrival)
    const boundKey = glanceBoundKey(row.arrival.platformName)
    const key = `${lineKey}:${boundKey}`
    const group = groups.get(key)
    if (group) group.rows.push(row)
    else groups.set(key, { lineKey, boundKey, rows: [row] })
  }
  return [...groups.entries()]
    .map(([key, group]) => ({ key, ...group }))
    .sort((a, b) =>
      compareGlanceGroups(a, b, options.priority, options.lineOrder)
    )
}

export type GlanceLayout = {
  layout: "anchor" | "pair"
  anchors: readonly GlanceGroup[]
  tiles: readonly GlanceGroup[]
}

/**
 * The anchor is the first group by position, or the one a tap pinned.
 * `pair` shows two equal anchors (the pinned or first, then the next).
 */
export const resolveGlanceLayout = (
  groups: readonly GlanceGroup[],
  options: { pinnedKey?: string | null; pair?: boolean } = {}
): GlanceLayout => {
  const pinned = options.pinnedKey
    ? groups.find((group) => group.key === options.pinnedKey)
    : undefined
  const first = pinned ?? groups[0]
  if (!first) return { layout: "anchor", anchors: [], tiles: [] }
  const rest = groups.filter((group) => group !== first)
  const pair = Boolean(options.pair) && rest.length > 0
  const anchors = pair ? [first, rest[0]!] : [first]
  return {
    layout: pair ? "pair" : "anchor",
    anchors,
    tiles: rest.slice(pair ? 1 : 0),
  }
}

/**
 * Unattended strip: real tiles, blanks to a whole column of the tallest strip,
 * then the first page again so the pan can run forward and snap back unseen.
 * `null` is a blank (CSS hides it where the strip has a single row).
 */
export const buildGlancePanStrip = <T>(
  tiles: readonly T[],
  visible = GLANCE_VISIBLE_TILES,
  rows = GLANCE_MAX_TILE_ROWS
): (T | null)[] => {
  if (tiles.length <= visible) return [...tiles]
  const pad = (rows - (tiles.length % rows)) % rows
  return [
    ...tiles,
    ...Array.from({ length: pad }, () => null),
    ...tiles.slice(0, visible),
  ]
}

/** Columns the real tiles fill at this row count (the pan loops after the last). */
export const glancePanColumns = (tileCount: number, rows: number): number =>
  rows > 0 ? Math.ceil(tileCount / rows) : 0

/**
 * Next pan step. Past the last real column the strip shows the cloned first
 * page; `snap` tells the caller to jump back to 0 without a transition.
 */
export const nextGlancePanOffset = (
  offset: number,
  columns: number
): { offset: number; snap: boolean } => {
  if (columns <= 0) return { offset: 0, snap: false }
  if (offset >= columns) return { offset: 0, snap: true }
  return { offset: offset + 1, snap: false }
}

/** "Due", minutes, or "Sched" for TfL's unknown platform rows. */
export const formatGlanceCountdown = (
  seconds?: number,
  platformName?: string
): string => {
  if (isUnknownArrivalsPlatform(platformName)) return "Sched"
  if (seconds === undefined || seconds < 0) return "—"
  if (seconds < 60) return "Due"
  return `${Math.floor(seconds / 60)}`
}

/** "then 4, 9" from the group's second and third trains (minutes, Due as 0). */
/**
 * Width a "then …" line needs, in em of its own (quiet) size, by how many
 * numbers and digits it carries. Hammersmith One has no tabular figures, so
 * each digit is charged at the widest figure (0.686em); "then " is 2.537em and
 * ", " 0.548em. Bucketed to the container-query steps in globals.css.
 */
const GLANCE_THEN_NEED: Readonly<Record<string, string>> = {
  "1:1": "3.25",
  "1:2": "3.95",
  "1:3": "4.6",
  "2:2": "4.5",
  "2:3": "5.2",
  "2:4": "5.85",
  "2:5": "6.55",
  "2:6": "7.25",
}

export type GlanceThenTier = { text: string; need: string }

/**
 * "then 4, 9", then "then 4": the longest that fits the room beside the
 * figure is shown (container query on the quiet column); none if neither fits.
 * Text never scales down.
 */
export const glanceThenTiers = (
  rows: readonly ArrivalsPreparedRow[]
): GlanceThenTier[] => {
  const rest = rows
    .slice(1, 3)
    .map((row) => row.arrival.timeToStation)
    .filter((value): value is number => typeof value === "number" && value >= 0)
    .map((value) => `${Math.floor(value / 60)}`)
  const tiers: GlanceThenTier[] = []
  for (let count = rest.length; count >= 1; count--) {
    const parts = rest.slice(0, count)
    const need = GLANCE_THEN_NEED[`${count}:${parts.join("").length}`] ?? null
    if (need) tiers.push({ text: `then ${parts.join(", ")}`, need })
  }
  return tiers
}

export const formatGlanceThen = (
  rows: readonly ArrivalsPreparedRow[]
): string | null => {
  const rest = rows
    .slice(1, 3)
    .map((row) => row.arrival.timeToStation)
    .filter((value): value is number => typeof value === "number" && value >= 0)
    .map((value) => `${Math.floor(value / 60)}`)
  return rest.length ? `then ${rest.join(", ")}` : null
}
