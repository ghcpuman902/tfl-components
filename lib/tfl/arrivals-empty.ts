/**
 * Why an arrivals board has no rows. Callers resolve this from fetch result +
 * clock + optional line-status *signal*; the board only paints arrivals copy.
 *
 * This module answers “are there trains coming?”, not line status. Status
 * kinds/validity may classify an empty list. Never pass reason text, Service
 * Closed labels, or engineering copy through to the UI.
 */
import {
  getStatusKind,
  getWorstCurrentStatus,
  normalizeLineId,
  type StatusKind,
} from "tfl-ts"
import { LONDON_TIME_ZONE, londonWeekdayLong } from "@/lib/tfl/london-dates"
import type { StatusLine } from "@/lib/tfl/status-types"

/** Night Tube lines. Night Overground is not in this set. */
export const NIGHT_TUBE_LINE_IDS = [
  "central",
  "jubilee",
  "northern",
  "piccadilly",
  "victoria",
] as const

const NIGHT_TUBE_LINE_ID_SET = new Set<string>(NIGHT_TUBE_LINE_IDS)

export type ArrivalsEmptyKind = "empty" | "ended" | "offline"

export const ARRIVALS_EMPTY_COPY: Record<ArrivalsEmptyKind, string> = {
  empty: "No arrivals right now.",
  ended: "Service has ended for tonight.",
  offline: "You're offline. Arrivals will update when you're back.",
}

/**
 * River predictions can be `[]` while line status is still Good Service
 * (RB4 / Woolwich Ferry). Do not claim that no boats are due.
 */
export const RIVER_ARRIVALS_EMPTY_COPY = "No live departure times available."

/** Per-route fallback when a bus/river group is empty. Rail uses {@link arrivalsLineEmptyCopy}. */
export const ARRIVALS_LINE_EMPTY_COPY = "No information"

/** Last spare tile on a short page that still has arrivals. */
export const ARRIVALS_END_COPY = "No more arrivals"

/** Narrow-width step of `ARRIVALS_END_COPY`. Accessible name stays the full phrase. */
export const ARRIVALS_END_COPY_SHORT = "No more"

/**
 * Subgroup heading when TfL sends `Platform Unknown` (or no platform at all)
 * on a live prediction. Distinct from a bound with no heading — that is
 * reserved for true “no bound metadata” (bus lists, empty unseeded lines).
 */
export const ARRIVALS_PLATFORM_UNKNOWN_HEADING = "Platform to be confirmed"

const londonHourFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: LONDON_TIME_ZONE,
  hour: "2-digit",
  hourCycle: "h23",
})

/** Europe/London hour (0–23) for an instant. Pass `nowMs` — never default the clock here. */
export const londonHour = (nowMs: number): number => {
  const hour = londonHourFormatter
    .formatToParts(new Date(nowMs))
    .find((part) => part.type === "hour")?.value
  return hour ? Number(hour) : 0
}

/**
 * Rough Underground closed window in London local time. Night buses still run,
 * so prefer `empty` for bus boards unless the caller forces `ended`.
 */
export const isLikelyRailServiceEnded = (nowMs: number): boolean => {
  const hour = londonHour(nowMs)
  return hour >= 1 && hour < 5
}

export const isNightTubeLine = (lineId: string): boolean =>
  NIGHT_TUBE_LINE_ID_SET.has(normalizeLineId(lineId))

/**
 * Friday-into-Saturday and Saturday-into-Sunday mornings, when Night Tube
 * runs. Bank-holiday extras are not modelled.
 */
export const isLondonNightTubeMorning = (nowMs: number): boolean => {
  if (!isLikelyRailServiceEnded(nowMs)) return false
  const weekday = londonWeekdayLong(nowMs)
  return weekday === "Saturday" || weekday === "Sunday"
}

/**
 * Overnight `ended` only for non-Night-Tube rail. Night Tube lines skip
 * Fri→Sat and Sat→Sun mornings. Ordinary Mon–Thu 01:00–05:00 is fine.
 */
export const lineLikelyFinishedOvernight = (
  lineId: string,
  nowMs: number
): boolean => {
  if (!isLikelyRailServiceEnded(nowMs)) return false
  if (isNightTubeLine(lineId) && isLondonNightTubeMorning(nowMs)) return false
  return true
}

/** Successful empty: none → “No arrivals right now.” Optional overnight ended. */
export const arrivalsLineEmptyCopy = (
  kind: ArrivalsEmptyKind | null
): string =>
  kind === "ended" ? ARRIVALS_EMPTY_COPY.ended : ARRIVALS_EMPTY_COPY.empty

/** Line status as a classification signal — id + current statuses only. */
export type ArrivalsStatusSignal = Pick<StatusLine, "id" | "lineStatuses">

/**
 * Current tfl-ts status kind per line, using validity windows at `nowMs`.
 * Reasons / descriptions are ignored.
 */
export const indexArrivalsStatusKinds = (
  lines: readonly ArrivalsStatusSignal[] | undefined,
  nowMs?: number
): Readonly<Record<string, StatusKind>> => {
  const out: Record<string, StatusKind> = {}
  if (!lines?.length) return out
  const statusNow = nowMs !== undefined ? { now: nowMs } : undefined
  for (const line of lines) {
    const id = normalizeLineId(line.id ?? "")
    if (!id) continue
    const worst = getWorstCurrentStatus(line.lineStatuses, statusNow)
    out[id] = worst ? getStatusKind(worst) : "good"
  }
  return out
}

const groupFinishedOvernight = (
  lineIds: readonly string[],
  nowMs: number
): boolean => {
  const ids = lineIds.map((id) => id.trim()).filter(Boolean)
  if (ids.length === 0) return true
  return ids.every((id) => lineLikelyFinishedOvernight(id, nowMs))
}

const servingLineIds = (lineIds: readonly string[] | undefined): string[] =>
  (lineIds ?? []).map((id) => id.trim()).filter(Boolean)

/**
 * Status kinds never upgrade a successful arrivals `[]` to unavailable.
 * Closed / suspended / planned work stay on the empty/ended path.
 */
export const statusKindForcesArrivalsUnavailable = (
  _kind: StatusKind | undefined
): false => false

/**
 * Successful `[]` stays `empty`/`ended` for every status kind. Closed,
 * suspended, planned work, and Good Service never become unavailable here
 * and never contribute copy.
 */
const classifySuccessfulRailEmpty = (
  lineIds: readonly string[] | undefined,
  nowMs: number,
  statusKinds: Readonly<Record<string, StatusKind>>
): ArrivalsEmptyKind => {
  const ids = servingLineIds(lineIds)
  for (const id of ids) {
    statusKindForcesArrivalsUnavailable(statusKinds[normalizeLineId(id)])
  }
  if (!isLikelyRailServiceEnded(nowMs)) return "empty"
  if (ids.length === 0) return "ended"
  return groupFinishedOvernight(ids, nowMs) ? "ended" : "empty"
}

type ResolveArrivalsEmptyKindOptions = {
  rowCount: number
  /** Fetch/render failure — board uses `error` instead. Status cannot override. */
  hasError?: boolean
  offline?: boolean
  /** Rail uses the overnight `ended` heuristic; bus and river do not. */
  domain?: "rail" | "bus" | "river"
  nowMs: number
  /**
   * Serving / selected line ids for station-level aggregation. Ended only when
   * every listed line would be finished. Omit to keep the unseeded network
   * behaviour (overnight → ended).
   */
  lineIds?: readonly string[]
  /** Optional current line status. Never makes a successful `[]` unavailable. */
  lineStatus?: readonly ArrivalsStatusSignal[]
}

/**
 * Pick an empty kind when there are no rows. Returns `null` when the board
 * should show arrivals or an error instead.
 */
export const resolveArrivalsEmptyKind = ({
  rowCount,
  hasError = false,
  offline = false,
  domain = "rail",
  nowMs,
  lineIds,
  lineStatus,
}: ResolveArrivalsEmptyKindOptions): ArrivalsEmptyKind | null => {
  if (hasError || rowCount > 0) return null
  if (offline) return "offline"
  if (domain !== "rail") return "empty"
  const statusKinds = indexArrivalsStatusKinds(lineStatus, nowMs)
  return classifySuccessfulRailEmpty(lineIds, nowMs, statusKinds)
}

type ResolveLineArrivalsEmptyKindOptions = {
  /** Group members (one id, or a shared-track merge). */
  lineIds: readonly string[]
  rowCount: number
  /** Fetch timestamp. Omit to refuse the overnight `ended` claim. */
  nowMs?: number
  /** Optional current line status. Closed / suspended stays `none`/`ended`. */
  lineStatus?: readonly ArrivalsStatusSignal[]
}

/**
 * Per-group empty kind after a successful fetch. A group that still has any
 * prediction stays `null` — empty sibling bounds stay local (`none`).
 * `ended` only when every member would be finished overnight. Status kinds
 * never supply copy and never turn a successful empty list into unavailable.
 */
export const resolveLineArrivalsEmptyKind = ({
  lineIds,
  rowCount,
  nowMs,
  lineStatus,
}: ResolveLineArrivalsEmptyKindOptions): ArrivalsEmptyKind | null => {
  if (rowCount > 0) return null
  if (nowMs === undefined) return "empty"
  const statusKinds = indexArrivalsStatusKinds(lineStatus, nowMs)
  return classifySuccessfulRailEmpty(lineIds, nowMs, statusKinds)
}
