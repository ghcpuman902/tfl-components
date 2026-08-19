import {
  CHART_ROWS,
  rowEventsForDay,
  rowStateForDay,
} from "@/lib/tfl/observatory/chart"
import type {
  ObservatoryHistoryEvent,
  ObservatoryState,
} from "@/lib/tfl/observatory/types"

const ABNORMAL_RANK: Record<string, number> = {
  unavailable: 4,
  incomplete: 3,
  suspect: 2,
  changed: 1,
}

export const isAbnormalHistoryState = (state: string | null): boolean =>
  state === "unavailable" ||
  state === "incomplete" ||
  state === "suspect" ||
  state === "changed"

export type HistoryRunRow = {
  id: string
  title: string
  state: ObservatoryState | "observed" | "current"
  summary: string | null
  observedCount: number | null
  baselineCount: number | null
}

export type HistoryRun = {
  at: string
  summary: string
  events: ObservatoryHistoryEvent[]
  rows: HistoryRunRow[]
  abnormal: HistoryRunRow[]
}

export const groupHistoryRuns = (
  events: readonly ObservatoryHistoryEvent[]
): HistoryRun[] => {
  const byAt = new Map<string, ObservatoryHistoryEvent[]>()
  for (const event of events) {
    const list = byAt.get(event.at) ?? []
    list.push(event)
    byAt.set(event.at, list)
  }

  return [...byAt.entries()]
    .sort(([a], [b]) => Date.parse(b) - Date.parse(a))
    .map(([at, group]) => {
      const run = group.find((event) => event.subjectId === null) ?? group[0]!
      const counts = new Map(
        (run.counts ?? []).map((count) => [count.id, count])
      )
      const rows: HistoryRunRow[] = CHART_ROWS.map((row) => {
        const state = (rowStateForDay(group, row.id) ?? "current") as
          | ObservatoryState
          | "observed"
        const matched = rowEventsForDay(group, row.id)
        const count = counts.get(row.id)
        return {
          id: row.id,
          title: row.title,
          state,
          summary: matched.at(-1)?.summary ?? null,
          observedCount: count?.observedCount ?? null,
          baselineCount: count?.baselineCount ?? null,
        }
      })

      const abnormal = [...rows]
        .filter((row) => isAbnormalHistoryState(row.state))
        .sort((a, b) => {
          const rank =
            (ABNORMAL_RANK[b.state] ?? 0) - (ABNORMAL_RANK[a.state] ?? 0)
          if (rank !== 0) return rank
          return a.title.localeCompare(b.title, "en")
        })

      return {
        at,
        summary: run.summary,
        events: group,
        rows,
        abnormal,
      }
    })
}
