/** Europe/London calendar helpers — no fixed 24h day length. */

export const LONDON_TIME_ZONE = "Europe/London"

const londonDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: LONDON_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})

const londonWeekdayFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: LONDON_TIME_ZONE,
  weekday: "long",
})

const londonDayMonthFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: LONDON_TIME_ZONE,
  day: "numeric",
  month: "short",
})

const londonPartsFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: LONDON_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
})

export type LondonDay = {
  /** YYYY-MM-DD in Europe/London */
  dateKey: string
  /** Inclusive start (UTC ms) of the London calendar day */
  startMs: number
  /** Exclusive end (UTC ms) of the London calendar day */
  endMs: number
  startIso: string
  endIso: string
  weekdayLong: string
  /** Short numeric date for control disambiguation, e.g. "9 Aug" */
  dayMonth: string
  label: "Today" | "Tomorrow" | string
}

const partsMap = (date: Date): Record<string, string> => {
  const out: Record<string, string> = {}
  for (const part of londonPartsFormatter.formatToParts(date)) {
    if (part.type !== "literal") out[part.type] = part.value
  }
  return out
}

/** Calendar date key (YYYY-MM-DD) for an instant in Europe/London. */
export const londonDateKey = (instant: Date = new Date()): string =>
  londonDateFormatter.format(instant)

/** Weekday name in Europe/London, e.g. "Saturday". Pass an explicit instant. */
export const londonWeekdayLong = (nowMs: number): string =>
  londonWeekdayFormatter.format(new Date(nowMs))

/**
 * UTC ms of Europe/London midnight for `dateKey` (YYYY-MM-DD).
 * Iteratively corrects for DST so day length is never assumed to be 24h.
 */
export const londonDayStartMs = (dateKey: string): number => {
  const year = Number(dateKey.slice(0, 4))
  const month = Number(dateKey.slice(5, 7))
  const day = Number(dateKey.slice(8, 10))
  if (!year || !month || !day) {
    throw new Error(`Invalid London date key: ${dateKey}`)
  }

  const desiredAsUtc = Date.UTC(year, month - 1, day, 0, 0, 0)
  let utc = desiredAsUtc

  for (let i = 0; i < 4; i += 1) {
    const parts = partsMap(new Date(utc))
    const localAsUtc = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second)
    )
    const delta = desiredAsUtc - localAsUtc
    if (delta === 0) break
    utc += delta
  }

  return utc
}

/** Add calendar days in Europe/London (DST-safe via midday probe). */
export const addLondonCalendarDays = (
  dateKey: string,
  days: number
): string => {
  const start = londonDayStartMs(dateKey)
  const probe = new Date(
    start + 12 * 60 * 60 * 1000 + days * 24 * 60 * 60 * 1000
  )
  return londonDateKey(probe)
}

/** Half-open [start, end) bounds for a London calendar day. */
export const londonDayBounds = (
  dateKey: string
): { startMs: number; endMs: number; startIso: string; endIso: string } => {
  const startMs = londonDayStartMs(dateKey)
  const nextKey = addLondonCalendarDays(dateKey, 1)
  const endMs = londonDayStartMs(nextKey)
  return {
    startMs,
    endMs,
    startIso: new Date(startMs).toISOString(),
    endIso: new Date(endMs).toISOString(),
  }
}

export type WeekAheadDayRange = {
  days: LondonDay[]
  /** Inclusive TfL dateRange.startDate (YYYY-MM-DD) */
  startDate: string
  /** Inclusive TfL dateRange.endDate (YYYY-MM-DD) — last displayed day */
  endDate: string
}

/**
 * Eight consecutive Europe/London calendar days starting today.
 * Day 0 Today, day 1 Tomorrow, days 2–7 full weekday names.
 */
export const buildWeekAheadDays = (
  now: Date = new Date()
): WeekAheadDayRange => {
  const todayKey = londonDateKey(now)
  const days: LondonDay[] = []

  for (let offset = 0; offset < 8; offset += 1) {
    const dateKey = addLondonCalendarDays(todayKey, offset)
    const bounds = londonDayBounds(dateKey)
    const midday = new Date(bounds.startMs + 12 * 60 * 60 * 1000)
    const weekdayLong = londonWeekdayFormatter.format(midday)
    const dayMonth = londonDayMonthFormatter.format(midday)
    const label =
      offset === 0 ? "Today" : offset === 1 ? "Tomorrow" : weekdayLong

    days.push({
      dateKey,
      startMs: bounds.startMs,
      endMs: bounds.endMs,
      startIso: bounds.startIso,
      endIso: bounds.endIso,
      weekdayLong,
      dayMonth,
      label,
    })
  }

  return {
    days,
    startDate: days[0]!.dateKey,
    endDate: days[7]!.dateKey,
  }
}

/**
 * Validity overlap for a selected half-open day:
 * period.fromDate < selectedDayEnd && period.toDate > selectedDayStart
 */
export const validityOverlapsDay = (
  period: { fromDate?: string; toDate?: string },
  dayStartMs: number,
  dayEndMs: number
): boolean => {
  if (!period.fromDate || !period.toDate) return false
  const fromMs = Date.parse(period.fromDate)
  const toMs = Date.parse(period.toDate)
  if (Number.isNaN(fromMs) || Number.isNaN(toMs)) return false
  return fromMs < dayEndMs && toMs > dayStartMs
}
