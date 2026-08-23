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
  STATION_HUBS,
  type LineStatusLike,
  type StatusKind,
} from "tfl-ts"
import {
  LONDON_TIME_ZONE,
  londonDateKey,
  londonWeekdayLong,
} from "@/lib/tfl/london-dates"
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
  /**
   * Later-today run end, when PlannedWork actually resumes during this
   * operating day. Overnight traffic-day ends and later calendar days omit it.
   */
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

/** Official labels that do not explain missing or present trains. */
const ARRIVALS_CHIP_HIDE = new Set([
  "good service",
  "special service",
  "no issues",
  "no exceptional delays",
  "no step free access",
  "information",
  "exit only",
  "change of frequency",
])

/** Closure / suspension labels that explain an empty board. */
const ARRIVALS_CHIP_ON_EMPTY = new Set([
  "planned closure",
  "part closure",
  "part closed",
  "service closed",
  "not running",
  "suspended",
  "part suspended",
  "closed",
  "no service",
  "bus service",
  "closure",
])

/** Labels that explain a group that still has trains. */
const ARRIVALS_CHIP_ON_TRAINS = new Set([
  "minor delays",
  "severe delays",
  "reduced service",
  "diverted",
  "issues reported",
  "planned closure",
  "part closure",
  "part closed",
  "suspended",
  "part suspended",
])

/** May create a following leftover page when the last page is exactly full. */
const ARRIVALS_LEFTOVER_CAN_ADD_PAGE = new Set([
  "severe delays",
  "suspended",
  "part suspended",
])

/** Arrivals-owned leftover-tile sentence. Never stitched to the chip. */
export const ARRIVALS_LEFTOVER_SENTENCE = "Expect longer waits."

export type ArrivalsLeftoverStatus = {
  label: string
  sentence: string
  canAddPage: boolean
}

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

type ParsedValidityPeriod = {
  fromMs: number
  toMs: number | undefined
}

const parseValidityPeriod = (
  period: ValidityPeriodLike
): ParsedValidityPeriod | undefined => {
  const from = periodField(period, "from")
  const to = periodField(period, "to")
  const fromMs = from ? Date.parse(from) : Number.NEGATIVE_INFINITY
  const toMs = to ? Date.parse(to) : undefined
  if (Number.isNaN(fromMs)) return undefined
  if (toMs !== undefined && Number.isNaN(toMs)) return undefined
  return { fromMs, toMs }
}

/** TfL splits "Sat from 1400, all day Sunday" across the overnight gap. */
const OVERNIGHT_CONTINUATION_MS = 8 * 3_600_000

const isOvernightContinuation = (
  endMs: number,
  nextFromMs: number
): boolean => {
  if (nextFromMs <= endMs) return true
  if (nextFromMs - endMs > OVERNIGHT_CONTINUATION_MS) return false
  return londonHour(endMs) < 5
}

const continuesRun = (
  endMs: number,
  period: ParsedValidityPeriod
): boolean =>
  period.fromMs <= endMs || isOvernightContinuation(endMs, period.fromMs)

/**
 * End of the current PlannedWork run: overlapping `toDate`/`to`, then later
 * overnight-split slices on the same row. Ignores `isNow` and never reads
 * `reason`. Open-ended current or continued slices return `undefined`.
 */
export const overlappingValidityToDateMs = (
  status: LineStatusLike | undefined,
  nowMs: number
): number | undefined => {
  const raw = status?.validityPeriods ?? []
  const overlapping = raw.filter((period) => periodOverlapsNow(period, nowMs))
  if (overlapping.length === 0) return undefined

  const overlappingEnds: number[] = []
  for (const period of overlapping) {
    const to = periodField(period, "to")
    if (!to) return undefined
    const toMs = Date.parse(to)
    if (Number.isNaN(toMs)) continue
    overlappingEnds.push(toMs)
  }
  if (overlappingEnds.length === 0) return undefined

  let endMs = Math.max(...overlappingEnds)
  const parsed = raw
    .map(parseValidityPeriod)
    .filter((period): period is ParsedValidityPeriod => period !== undefined)

  let grew = true
  while (grew) {
    grew = false
    for (const period of parsed) {
      if (!continuesRun(endMs, period)) continue
      if (period.toMs === undefined) return undefined
      if (period.toMs > endMs) {
        endMs = period.toMs
        grew = true
      }
    }
  }
  return endMs
}

/** Clock copy is only honest for a same-calendar-day, in-service resume. */
const isLaterTodayResumeClock = (resumeMs: number, nowMs: number): boolean => {
  if (isLikelyRailServiceEnded(resumeMs)) return false
  return londonDateKey(new Date(resumeMs)) === londonDateKey(new Date(nowMs))
}

const statusDescription = (status: LineStatusLike): string =>
  (status.statusSeverityDescription ?? status.severityDescription ?? "")
    .trim()
    .toLowerCase()

/** Official TfL `statusSeverityDescription` as sent — never reason text. */
export const officialStatusDescription = (
  status: LineStatusLike | undefined
): string | undefined => {
  const label = (
    status?.statusSeverityDescription ??
    status?.severityDescription ??
    ""
  ).trim()
  return label || undefined
}

const isDelayOnlyStatus = (status: LineStatusLike): boolean =>
  DELAY_ONLY_DESCRIPTIONS.has(statusDescription(status))

const isServiceClosedStatus = (status: LineStatusLike | undefined): boolean =>
  Boolean(status && statusDescription(status) === "service closed")

type AffectedStopLike = {
  id?: string
  naptanId?: string
  stationNaptan?: string
  stationNaptanId?: string
}

type AffectedRouteLike = {
  isEntireRouteSection?: boolean
  routeSectionNaptanEntrySequence?: Array<{ stopPoint?: AffectedStopLike }>
  stops?: AffectedStopLike[]
}

type ArrivalsDisruptionLike = {
  category?: string
  affectedStops?: AffectedStopLike[]
  affectedRoutes?: AffectedRouteLike[]
}

type ArrivalsLineStatus = LineStatusLike & {
  disruption?: ArrivalsDisruptionLike
}

const stopIdentityIds = (stop: AffectedStopLike | undefined): string[] => {
  if (!stop) return []
  return [
    ...new Set(
      [stop.stationNaptan, stop.stationNaptanId, stop.naptanId, stop.id]
        .map((id) => id?.trim())
        .filter((id): id is string => Boolean(id))
    ),
  ]
}

const disruptionOf = (status: LineStatusLike): ArrivalsDisruptionLike =>
  (status as ArrivalsLineStatus).disruption ?? {}

/**
 * Hub + member Naptans for a board stop. Empty when the board has no stop id
 * — callers then keep line-wide status (docs fixtures, unscoped demos).
 */
export const stationIdentityIdsForStop = (
  stopPointId: string | undefined
): string[] => {
  const id = stopPointId?.trim()
  if (!id) return []
  const ids = new Set<string>([id])
  const hub = STATION_HUBS[id]
  if (hub?.hubId) ids.add(hub.hubId)
  for (const member of hub?.members ?? []) ids.add(member.id)
  return [...ids]
}

const extractAffectedStopIds = (status: LineStatusLike): string[] => {
  const disruption = disruptionOf(status)
  const ids: string[] = []
  for (const route of disruption.affectedRoutes ?? []) {
    for (const entry of route.routeSectionNaptanEntrySequence ?? []) {
      ids.push(...stopIdentityIds(entry.stopPoint))
    }
    for (const stop of route.stops ?? []) ids.push(...stopIdentityIds(stop))
  }
  for (const stop of disruption.affectedStops ?? []) {
    ids.push(...stopIdentityIds(stop))
  }
  return [...new Set(ids)]
}

/**
 * Whether a `getStatus({ detail: true })` row applies at this station.
 * Entire-route rows and payloads with no geography stay relevant. Structured
 * affected stops / route naptans win over line-wide leftover copy — never
 * parse `reason`.
 */
export const statusAffectsStation = (
  status: LineStatusLike,
  stationIds: readonly string[] | undefined
): boolean => {
  if (!stationIds?.length) return true
  const disruption = disruptionOf(status)
  if (disruption.affectedRoutes?.some((route) => route.isEntireRouteSection)) {
    return true
  }
  const affectedIds = extractAffectedStopIds(status)
  if (affectedIds.length === 0) return true
  const wanted = new Set(stationIds)
  return affectedIds.some((id) => wanted.has(id))
}

const statusesAffectingStation = (
  statuses: readonly LineStatusLike[] | undefined,
  stationIds: readonly string[] | undefined
): LineStatusLike[] =>
  (statuses ?? []).filter((status) => statusAffectsStation(status, stationIds))

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

/**
 * Worst current row across a group (shared-platform merge included).
 * Uses `getWorstCurrentStatus` — Circle Planned Closure (4) beats District
 * Part Closure (5).
 */
export const groupWorstCurrentStatus = (
  lineIds: readonly string[],
  lineStatus: readonly ArrivalsStatusSignal[] | undefined,
  nowMs?: number,
  stationIds?: readonly string[]
): LineStatusLike | undefined => {
  const ids = servingLineIds(lineIds)
  if (!ids.length || !lineStatus?.length) return undefined
  const byId = indexStatusSignals(lineStatus)
  const statuses: LineStatusLike[] = []
  for (const id of ids) {
    const line = byId[normalizeLineId(id)]
    statuses.push(...statusesAffectingStation(line?.lineStatuses, stationIds))
  }
  if (!statuses.length) return undefined
  return getWorstCurrentStatus(
    statuses,
    nowMs !== undefined ? { now: nowMs } : undefined
  )
}

type ResolveArrivalsStatusChipOptions = {
  lineIds: readonly string[]
  hasTrains: boolean
  emptyKind?: ArrivalsEmptyKind | null
  lineStatus?: readonly ArrivalsStatusSignal[]
  nowMs?: number
  hasError?: boolean
  /** Board stop. Filters line status to geography that affects this station. */
  stopPointId?: string
}

/**
 * QuietChip label for arrivals. Official description only; never stitched
 * into the arrivals sentence and never taken from `reason`.
 */
export const resolveArrivalsStatusChip = ({
  lineIds,
  hasTrains,
  emptyKind,
  lineStatus,
  nowMs,
  hasError = false,
  stopPointId,
}: ResolveArrivalsStatusChipOptions): string | null => {
  if (hasError || emptyKind === "offline") return null
  const worst = groupWorstCurrentStatus(
    lineIds,
    lineStatus,
    nowMs,
    stationIdentityIdsForStop(stopPointId)
  )
  const label = officialStatusDescription(worst)
  if (!label) return null
  const key = label.toLowerCase()
  if (ARRIVALS_CHIP_HIDE.has(key)) return null
  if (hasTrains) {
    if (key === "service closed") return null
    return ARRIVALS_CHIP_ON_TRAINS.has(key) ? label : null
  }
  if (DELAY_ONLY_DESCRIPTIONS.has(key)) return null
  return ARRIVALS_CHIP_ON_EMPTY.has(key) ? label : null
}

/**
 * Leftover rail tile when a group still has trains. Empty boards stay on the
 * empty-row path. Delay-only labels never add a page. Pass `stopPointId` so a
 * part closure that does not include this station is not painted here.
 */
export const resolveArrivalsLeftoverStatus = ({
  lineIds,
  lineStatus,
  nowMs,
  hasError = false,
  stopPointId,
}: {
  lineIds: readonly string[]
  lineStatus?: readonly ArrivalsStatusSignal[]
  nowMs?: number
  hasError?: boolean
  stopPointId?: string
}): ArrivalsLeftoverStatus | null => {
  const label = resolveArrivalsStatusChip({
    lineIds,
    hasTrains: true,
    lineStatus,
    nowMs,
    hasError,
    stopPointId,
  })
  if (!label) return null
  return {
    label,
    sentence: ARRIVALS_LEFTOVER_SENTENCE,
    canAddPage: ARRIVALS_LEFTOVER_CAN_ADD_PAGE.has(label.toLowerCase()),
  }
}

const plannedWorkResumeMs = (
  status: LineStatusLike,
  nowMs: number
): number | undefined => {
  if (status.disruption?.category !== "PlannedWork") return undefined
  if (isDelayOnlyStatus(status)) return undefined
  const resumeMs = overlappingValidityToDateMs(status, nowMs)
  if (resumeMs === undefined) return undefined
  return isLaterTodayResumeClock(resumeMs, nowMs) ? resumeMs : undefined
}

const resolveGroupDisruption = (
  lineIds: readonly string[],
  lineStatus: readonly ArrivalsStatusSignal[] | undefined,
  nowMs: number,
  stationIds?: readonly string[]
): ArrivalsEmptyState | null => {
  if (!lineIds.length || !lineStatus?.length) return null
  const byId = indexStatusSignals(lineStatus)
  const resumes: number[] = []
  for (const id of lineIds) {
    const line = byId[normalizeLineId(id)]
    const worst = getWorstCurrentStatus(
      statusesAffectingStation(line?.lineStatuses, stationIds),
      { now: nowMs }
    )
    statusKindForcesArrivalsUnavailable(
      worst ? getStatusKind(worst) : undefined
    )
    if (!isCurrentArrivalsDisruption(worst, nowMs) || !worst) return null
    const lineResumeMs = plannedWorkResumeMs(worst, nowMs)
    if (lineResumeMs !== undefined) resumes.push(lineResumeMs)
  }
  const sameResume =
    resumes.length === lineIds.length &&
    resumes.every((value) => value === resumes[0])
  return sameResume
    ? { kind: "disrupted", resumeMs: resumes[0] }
    : { kind: "disrupted" }
}

/**
 * Successful `[]`: current disruption (with optional resume clock) wins over
 * overnight `ended`. Closed / planned work never become unavailable and never
 * contribute reason text.
 */
const classifySuccessfulRailEmpty = (
  lineIds: readonly string[] | undefined,
  nowMs: number,
  lineStatus: readonly ArrivalsStatusSignal[] | undefined,
  stationIds?: readonly string[]
): ArrivalsEmptyState => {
  const ids = servingLineIds(lineIds)
  const disrupted = resolveGroupDisruption(ids, lineStatus, nowMs, stationIds)
  const overnight =
    ids.length === 0
      ? isLikelyRailServiceEnded(nowMs)
      : groupFinishedOvernight(ids, nowMs)
  if (disrupted) {
    // Timetable / overnight Service Closed keeps ended + chip, not "No service."
    if (
      overnight &&
      disrupted.resumeMs === undefined &&
      isServiceClosedStatus(
        groupWorstCurrentStatus(ids, lineStatus, nowMs, stationIds)
      )
    ) {
      return { kind: "ended" }
    }
    return disrupted
  }
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
  /** Board stop. Filters disruption empty-copy to this station's geography. */
  stopPointId?: string
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
  stopPointId,
}: ResolveArrivalsEmptyKindOptions): ArrivalsEmptyState | null => {
  if (hasError || rowCount > 0) return null
  if (offline) return { kind: "offline" }
  if (domain !== "rail") return { kind: "empty" }
  return classifySuccessfulRailEmpty(
    lineIds,
    nowMs,
    lineStatus,
    stationIdentityIdsForStop(stopPointId)
  )
}

type ResolveLineArrivalsEmptyKindOptions = {
  /** Group members (one id, or a shared-track merge). */
  lineIds: readonly string[]
  rowCount: number
  /** Fetch timestamp. Omit to refuse the overnight `ended` claim. */
  nowMs?: number
  /** Optional current line status. Closed / planned work may become `disrupted`. */
  lineStatus?: readonly ArrivalsStatusSignal[]
  /** Board stop. Filters disruption empty-copy to this station's geography. */
  stopPointId?: string
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
  stopPointId,
}: ResolveLineArrivalsEmptyKindOptions): ArrivalsEmptyState | null => {
  if (rowCount > 0) return null
  if (nowMs === undefined) return { kind: "empty" }
  return classifySuccessfulRailEmpty(
    lineIds,
    nowMs,
    lineStatus,
    stationIdentityIdsForStop(stopPointId)
  )
}
