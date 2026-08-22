/**
 * Why an arrivals board has no rows. Callers resolve this from fetch result +
 * clock; the board only paints the copy.
 *
 * This module answers “are there trains coming?”, not line status. Do not pass
 * severity, Service Closed, or disruption text through here.
 */
import { normalizeLineId } from "tfl-ts"
import { Lines } from "tfl-ts/dist/generated/meta/Line.js"
import { LONDON_TIME_ZONE, londonWeekdayLong } from "@/lib/tfl/london-dates"

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

/** Per-line / per-route when predictions are missing but the line is still shown. */
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

/**
 * Lines whose static TfL catalogue lists a Night service type. That is a
 * capability flag, not “running tonight” — pair with
 * {@link isLondonNightServiceMorning}.
 */
const NIGHT_SERVICE_LINE_IDS = new Set(
  Lines.filter((line) =>
    line.serviceTypes.some((service) => service.name === "Night")
  ).map((line) => normalizeLineId(line.id))
)

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

/** Catalogue Night service type (Night Tube / Night Overground capability). */
export const lineHasNightServiceType = (lineId: string): boolean =>
  NIGHT_SERVICE_LINE_IDS.has(normalizeLineId(lineId))

/**
 * Friday-into-Saturday and Saturday-into-Sunday mornings, when Night Tube /
 * Night Overground actually run. Bank-holiday extras are not in the catalogue.
 */
export const isLondonNightServiceMorning = (nowMs: number): boolean => {
  if (!isLikelyRailServiceEnded(nowMs)) return false
  const weekday = londonWeekdayLong(nowMs)
  return weekday === "Saturday" || weekday === "Sunday"
}

/**
 * True when this line is unlikely to still be producing arrivals in the
 * overnight window. Night-capable lines stay false on Fri/Sat nights.
 */
export const lineLikelyFinishedOvernight = (
  lineId: string,
  nowMs: number
): boolean => {
  if (!isLikelyRailServiceEnded(nowMs)) return false
  if (lineHasNightServiceType(lineId) && isLondonNightServiceMorning(nowMs)) {
    return false
  }
  return true
}

export const arrivalsLineEmptyCopy = (
  kind: ArrivalsEmptyKind | null
): string =>
  kind === "ended" ? ARRIVALS_EMPTY_COPY.ended : ARRIVALS_LINE_EMPTY_COPY

type ResolveArrivalsEmptyKindOptions = {
  rowCount: number
  /** Fetch/render failure — board uses `error` instead. */
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
}: ResolveArrivalsEmptyKindOptions): ArrivalsEmptyKind | null => {
  if (hasError || rowCount > 0) return null
  if (offline) return "offline"
  if (domain !== "rail" || !isLikelyRailServiceEnded(nowMs)) return "empty"
  if (!lineIds?.length) return "ended"
  return lineIds.every((id) => lineLikelyFinishedOvernight(id, nowMs))
    ? "ended"
    : "empty"
}

type ResolveLineArrivalsEmptyKindOptions = {
  /** Group members (one id, or District+Circle, etc.). */
  lineIds: readonly string[]
  rowCount: number
  /** Fetch timestamp. Omit to refuse the overnight `ended` claim. */
  nowMs?: number
}

/**
 * Per-line / per-group empty kind after a successful fetch. A line that still
 * has any prediction stays `null` — empty sibling bounds keep “No information”.
 * `ended` only when every member would be finished overnight.
 */
export const resolveLineArrivalsEmptyKind = ({
  lineIds,
  rowCount,
  nowMs,
}: ResolveLineArrivalsEmptyKindOptions): ArrivalsEmptyKind | null => {
  if (rowCount > 0) return null
  if (nowMs === undefined || !isLikelyRailServiceEnded(nowMs)) return "empty"
  const ids = lineIds.map((id) => id.trim()).filter(Boolean)
  if (ids.length === 0) return "ended"
  return ids.every((id) => lineLikelyFinishedOvernight(id, nowMs))
    ? "ended"
    : "empty"
}
