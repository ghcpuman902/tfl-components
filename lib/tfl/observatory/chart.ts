export const DAY_MS = 86_400_000
export const CHART_WEEKS = 53

export const startOfLocalDay = (ms: number): number => {
  const date = new Date(ms)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

/** Monday 00:00 of the local week that contains `ms`. */
export const startOfLocalWeek = (ms: number): number => {
  const date = new Date(startOfLocalDay(ms))
  const weekday = date.getDay()
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday
  date.setDate(date.getDate() + mondayOffset)
  return date.getTime()
}

export const observationChartGrid = (
  nowMs: number,
  weekCount = CHART_WEEKS
): { start: number; today: number; weeks: number[][] } => {
  const today = startOfLocalDay(nowMs)
  const thisMonday = startOfLocalWeek(nowMs)
  const start = thisMonday - (weekCount - 1) * 7 * DAY_MS
  return {
    start,
    today,
    weeks: Array.from({ length: weekCount }, (_, weekIndex) => {
      const weekStart = start + weekIndex * 7 * DAY_MS
      return Array.from(
        { length: 7 },
        (_, dayIndex) => weekStart + dayIndex * DAY_MS
      )
    }),
  }
}

export const monthLabelsForGrid = (
  weeks: readonly (readonly number[])[],
  locale?: string
): { weekIndex: number; label: string }[] => {
  const labels: { weekIndex: number; label: string }[] = []
  for (let weekIndex = 0; weekIndex < weeks.length; weekIndex += 1) {
    const firstOfMonth = weeks[weekIndex]?.find(
      (dayStart) => new Date(dayStart).getDate() === 1
    )
    if (firstOfMonth == null) continue
    if (labels.at(-1)?.weekIndex === weekIndex - 1) continue
    labels.push({
      weekIndex,
      label: new Intl.DateTimeFormat(locale, { month: "short" }).format(
        new Date(firstOfMonth)
      ),
    })
  }
  return labels
}

const STATE_RANK: Record<string, number> = {
  unavailable: 5,
  incomplete: 4,
  suspect: 3,
  changed: 2,
  current: 1,
  observed: 0,
}

export const worstHistoryState = (states: readonly string[]): string | null => {
  let worst: string | null = null
  let rank = -1
  for (const state of states) {
    const next = STATE_RANK[state] ?? -1
    if (next > rank) {
      worst = state
      rank = next
    }
  }
  return worst
}

export const eventsOnLocalDay = <T extends { at: string }>(
  events: readonly T[],
  dayStart: number
): T[] => {
  const dayEnd = dayStart + DAY_MS
  return events.filter((event) => {
    const atMs = Date.parse(event.at)
    return Number.isFinite(atMs) && atMs >= dayStart && atMs < dayEnd
  })
}

export const CHART_ROWS = [
  {
    id: "lines",
    title: "Line catalogue",
    fillFromRun: true,
    match: (subjectId: string | null) => subjectId === "lines",
  },
  {
    id: "stops",
    title: "Stop points",
    fillFromRun: true,
    match: (subjectId: string | null) =>
      Boolean(subjectId?.startsWith("stops:")),
  },
  {
    id: "routes",
    title: "Route sequences",
    fillFromRun: true,
    match: (subjectId: string | null) =>
      Boolean(subjectId?.startsWith("route:")),
  },
  {
    id: "bus-lines",
    title: "Bus lines",
    fillFromRun: true,
    match: (subjectId: string | null) => subjectId === "census:bus-lines",
  },
  {
    id: "bus-points",
    title: "Bus stops",
    fillFromRun: true,
    match: (subjectId: string | null) => subjectId === "census:bus-points",
  },
  {
    id: "bike-points",
    title: "Cycle hire",
    fillFromRun: true,
    match: (subjectId: string | null) => subjectId === "census:bike-points",
  },
] as const

export type ChartRowId = (typeof CHART_ROWS)[number]["id"]

export type DayMark =
  | "future"
  | "missing"
  | "quiet"
  | "suspect"
  | "changed"
  | "incomplete"
  | "unavailable"

export const rowEventsForDay = <
  T extends { subjectId: string | null; state: string; summary: string },
>(
  events: readonly T[],
  rowId: ChartRowId
): T[] => {
  const row = CHART_ROWS.find((entry) => entry.id === rowId)
  if (!row) return []
  return events.filter((event) => row.match(event.subjectId))
}

export const rowStateForDay = <
  T extends { subjectId: string | null; state: string },
>(
  events: readonly T[],
  rowId: ChartRowId
): string | null => {
  if (events.length === 0) return null
  const row = CHART_ROWS.find((entry) => entry.id === rowId)
  if (!row) return null
  const matched = events.filter((event) => row.match(event.subjectId))
  if (matched.length > 0) {
    return worstHistoryState(matched.map((event) => event.state))
  }
  if (row.fillFromRun && events.some((event) => event.subjectId === null)) {
    return "current"
  }
  return null
}

export const dayMark = (
  dayStart: number,
  today: number,
  states: readonly string[]
): DayMark => {
  if (dayStart > today) return "future"
  if (states.length === 0) return dayStart === today ? "future" : "missing"
  const worst = worstHistoryState(states)
  if (worst === "current" || worst === "observed" || worst == null) {
    return "quiet"
  }
  if (
    worst === "suspect" ||
    worst === "changed" ||
    worst === "incomplete" ||
    worst === "unavailable"
  ) {
    return worst
  }
  return "quiet"
}
