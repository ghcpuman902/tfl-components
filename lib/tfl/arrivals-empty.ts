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
  type LineStatusLike,
  type StatusKind,
} from "tfl-ts"
import { LONDON_TIME_ZONE, londonWeekdayLong } from "@/lib/tfl/london-dates"
import { isCurrentAnnouncement } from "@/lib/tfl/status-reason"
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

export type ArrivalsEmptyKind = "empty" | "ended" | "offline" | "disrupted"

export type ArrivalsEmptyState = {
  kind: ArrivalsEmptyKind
  /** Closure window end (`validityPeriods[].toDate`) when a period overlaps now. */
  resumeMs?: number
}

export const ARRIVALS_EMPTY_COPY: Record<ArrivalsEmptyKind, string> = {
  empty: "No arrivals right now.",
  ended: "Service has ended for tonight.",
  offline: "You're offline. Arrivals will update when you're back.",
  disrupted: "No service.",
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

const DELAY_ONLY_DESCRIPTIONS = new Set([
  "minor delays",
  "severe delays",
  "reduced service",
  "diverted",
  "issues reported",
])

const londonHourFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: LONDON_TIME_ZONE,
  hour: "2-digit",
  hourCycle: "h23",
})

const londonClockPartsFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: LONDON_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
})

/** Europe/London hour (0–23) for an instant. Pass `nowMs` — never default the clock here. */
export const londonHour = (nowMs: number): number => {
  const hour = londonHourFormatter
    .formatToParts(new Date(nowMs))
    .find((part) => part.type === "hour")?.value
  return hour ? Number(hour) : 0
}

/** Europe/London clock for a known instant, e.g. `10:30`. */
export const formatLondonClockTime = (ms: number): string => {
  const parts = londonClockPartsFormatter.formatToParts(new Date(ms))
  const hour = parts.find((part) => part.type === "hour")?.value ?? "00"
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00"
  return `${hour}:${minute}`
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

export const arrivalsDisruptedCopy = (resumeMs?: number): string =>
  resumeMs === undefined
    ? ARRIVALS_EMPTY_COPY.disrupted
    : `No service until ${formatLondonClockTime(resumeMs)}.`

/** Successful empty: none, overnight ended, or a short disruption note. */
export const arrivalsLineEmptyCopy = (
  state: ArrivalsEmptyState | ArrivalsEmptyKind | null
): string => {
  if (state == null) return ARRIVALS_EMPTY_COPY.empty
  if (typeof state === "string") {
    return state === "disrupted"
      ? ARRIVALS_EMPTY_COPY.disrupted
      : ARRIVALS_EMPTY_COPY[state]
  }
  if (state.kind === "disrupted") return arrivalsDisruptedCopy(state.resumeMs)
  return ARRIVALS_EMPTY_COPY[state.kind]
}

/** Line status as a classification signal — id + current statuses only. */
export type ArrivalsStatusSignal = Pick<StatusLine, "id" | "lineStatuses">

type ValidityPeriodLike = {
  from?: string
  to?: string
  fromDate?: string
  toDate?: string
  isNow?: boolean
}

const periodField = (
  period: ValidityPeriodLike,
  edge: "from" | "to"
): string | undefined =>
  edge === "from"
    ? (period.from ?? period.fromDate)
    : (period.to ?? period.toDate)

const periodOverlapsNow = (
  period: ValidityPeriodLike,
  nowMs: number
): boolean => {
  const from = periodField(period, "from")
  const to = periodField(period, "to")
  if (!from && !to) return true
  const fromMs = from ? Date.parse(from) : Number.NEGATIVE_INFINITY
  const toMs = to ? Date.parse(to) : Number.POSITIVE_INFINITY
  if (Number.isNaN(fromMs) || Number.isNaN(toMs)) return true
  return nowMs >= fromMs && nowMs <= toMs
}

/**
 * Earliest overlapping `toDate`/`to`. Ignores `isNow` and never reads `reason`.
 */
export const overlappingValidityToDateMs = (
  status: LineStatusLike | undefined,
  nowMs: number
): number | undefined => {
  let earliest: number | undefined
  for (const period of status?.validityPeriods ?? []) {
    if (!periodOverlapsNow(period, nowMs)) continue
    const to = periodField(period, "to")
    if (!to) continue
    const toMs = Date.parse(to)
    if (Number.isNaN(toMs)) continue
    if (earliest === undefined || toMs < earliest) earliest = toMs
  }
  return earliest
}

const statusDescription = (status: LineStatusLike): string =>
  (status.statusSeverityDescription ?? status.severityDescription ?? "")
    .trim()
    .toLowerCase()

const isDelayOnlyStatus = (status: LineStatusLike): boolean =>
  DELAY_ONLY_DESCRIPTIONS.has(statusDescription(status))

/**
 * Current closure / suspension / planned work — not Good Service, info, or
 * delay-only rows. Uses `isCurrentAnnouncement` (clock overlap, not `isNow`).
 */
export const isCurrentArrivalsDisruption = (
  status: LineStatusLike | undefined,
  nowMs: number
): boolean => {
  if (!status || !isCurrentAnnouncement(status, nowMs)) return false
  const kind = getStatusKind(status)
  if (kind === "good" || kind === "info") return false
  if (isDelayOnlyStatus(status)) return false
  return kind === "plannedWork" || kind === "closed" || kind === "incident"
}

/**
 * Current tfl-ts status kind per line, using validity windows at `nowMs`.
 * Reasons / descriptions are ignored for copy.
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

const indexStatusSignals = (
  lines: readonly ArrivalsStatusSignal[] | undefined
): Readonly<Record<string, ArrivalsStatusSignal>> => {
  const out: Record<string, ArrivalsStatusSignal> = {}
  for (const line of lines ?? []) {
    const id = normalizeLineId(line.id ?? "")
    if (id) out[id] = line
  }
  return out
}

/**
 * Status kinds never upgrade a successful arrivals `[]` to unavailable.
 */
export const statusKindForcesArrivalsUnavailable = (
  _kind: StatusKind | undefined
): false => false

const resolveGroupDisruption = (
  lineIds: readonly string[],
  lineStatus: readonly ArrivalsStatusSignal[] | undefined,
  nowMs: number
): ArrivalsEmptyState | null => {
  if (!lineIds.length || !lineStatus?.length) return null
  const byId = indexStatusSignals(lineStatus)
  let resumeMs: number | undefined
  for (const id of lineIds) {
    const line = byId[normalizeLineId(id)]
    const worst = getWorstCurrentStatus(line?.lineStatuses, { now: nowMs })
    statusKindForcesArrivalsUnavailable(
      worst ? getStatusKind(worst) : undefined
    )
    if (!isCurrentArrivalsDisruption(worst, nowMs) || !worst) return null
    const lineResumeMs = overlappingValidityToDateMs(worst, nowMs)
    if (lineResumeMs !== undefined) {
      resumeMs =
        resumeMs === undefined ? lineResumeMs : Math.min(resumeMs, lineResumeMs)
    }
  }
  return resumeMs === undefined
    ? { kind: "disrupted" }
    : { kind: "disrupted", resumeMs }
}

/**
 * Successful `[]`: current disruption (with optional resume clock) wins over
 * overnight `ended`. Closed / planned work never become unavailable and never
 * contribute reason text.
 */
const classifySuccessfulRailEmpty = (
  lineIds: readonly string[] | undefined,
  nowMs: number,
  lineStatus: readonly ArrivalsStatusSignal[] | undefined
): ArrivalsEmptyState => {
  const ids = servingLineIds(lineIds)
  const disrupted = resolveGroupDisruption(ids, lineStatus, nowMs)
  if (disrupted) return disrupted
  if (!isLikelyRailServiceEnded(nowMs)) return { kind: "empty" }
  if (ids.length === 0) return { kind: "ended" }
  return { kind: groupFinishedOvernight(ids, nowMs) ? "ended" : "empty" }
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
   * every listed line would be finished. Disruption only when every listed
   * line is currently disrupted. Omit to keep the unseeded network behaviour
   * (overnight → ended).
   */
  lineIds?: readonly string[]
  /** Optional current line status. Never makes a successful `[]` unavailable. */
  lineStatus?: readonly ArrivalsStatusSignal[]
}

/**
 * Pick an empty state when there are no rows. Returns `null` when the board
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
}: ResolveArrivalsEmptyKindOptions): ArrivalsEmptyState | null => {
  if (hasError || rowCount > 0) return null
  if (offline) return { kind: "offline" }
  if (domain !== "rail") return { kind: "empty" }
  return classifySuccessfulRailEmpty(lineIds, nowMs, lineStatus)
}

type ResolveLineArrivalsEmptyKindOptions = {
  /** Group members (one id, or a shared-track merge). */
  lineIds: readonly string[]
  rowCount: number
  /** Fetch timestamp. Omit to refuse the overnight `ended` claim. */
  nowMs?: number
  /** Optional current line status. Closed / planned work may become `disrupted`. */
  lineStatus?: readonly ArrivalsStatusSignal[]
}

/**
 * Per-group empty state after a successful fetch. A group that still has any
 * prediction stays `null` — empty sibling bounds stay local (`none`).
 * `disrupted` only when every member is currently disrupted. `ended` only when
 * every member would be finished overnight and no current disruption applies.
 */
export const resolveLineArrivalsEmptyKind = ({
  lineIds,
  rowCount,
  nowMs,
  lineStatus,
}: ResolveLineArrivalsEmptyKindOptions): ArrivalsEmptyState | null => {
  if (rowCount > 0) return null
  if (nowMs === undefined) return { kind: "empty" }
  return classifySuccessfulRailEmpty(lineIds, nowMs, lineStatus)
}
