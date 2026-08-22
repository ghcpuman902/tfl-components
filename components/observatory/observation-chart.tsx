"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  CHART_ROWS,
  dayMark,
  eventsOnLocalDay,
  monthLabelsForGrid,
  observationChartGrid,
  rowEventsForDay,
  rowStateForDay,
  type DayMark,
} from "@/lib/tfl/observatory/chart"
import { observatoryStateLabel } from "@/lib/tfl/observatory/format"
import type { ObservatoryHistoryEvent } from "@/lib/tfl/observatory/types"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

const WEEKDAY_LABELS = ["Mon", "", "Wed", "", "Fri", "", ""] as const

const CELL_FILL: Record<DayMark, string> = {
  future: "bg-muted",
  missing: "bg-background",
  quiet: "bg-emerald-500/80 dark:bg-emerald-400/70",
  suspect: "bg-amber-500/80 dark:bg-amber-400/70",
  changed: "bg-sky-500/80 dark:bg-sky-400/70",
  incomplete: "bg-rose-500/80 dark:bg-rose-400/70",
  unavailable: "bg-rose-500/80 dark:bg-rose-400/70",
}

const dayDateLabel = (ms: number): string =>
  new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(ms))

const markLabel = (mark: DayMark): string => {
  if (mark === "future") return "Not yet"
  if (mark === "missing") return "No observation"
  if (mark === "quiet") return "Unchanged"
  return observatoryStateLabel(mark)
}

const rowLabel = (state: string | null, mark: DayMark): string => {
  if (mark === "future") return "Not yet"
  if (state == null) return "No observation"
  return observatoryStateLabel(state as ObservatoryHistoryEvent["state"])
}

const ChartCell = ({
  date,
  mark,
  rows,
}: {
  date: string
  mark: DayMark
  rows: { title: string; label: string; summary: string | null }[]
}) => {
  const label = `${date}, ${markLabel(mark)}`

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className={cn(
            "relative size-2.5 overflow-hidden rounded-xs hover:ring-1 hover:ring-foreground focus-visible:ring-2 focus-visible:ring-foreground",
            CELL_FILL[mark]
          )}
        >
          {mark === "missing" ? (
            <span
              aria-hidden
              className="absolute inset-0 text-muted-foreground/70"
            >
              <span className="absolute inset-0 bg-current [clip-path:polygon(0_0,22%_0,100%_78%,100%_100%,78%_100%,0_22%)]" />
              <span className="absolute inset-0 bg-current [clip-path:polygon(78%_0,100%_0,100%_22%,22%_100%,0_100%,0_78%)]" />
            </span>
          ) : null}
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="max-w-64 flex-col items-stretch gap-1 py-2"
      >
        <p>{date}</p>
        <p>{markLabel(mark)}</p>
        {mark === "future" || mark === "missing" ? null : (
          <ul className="grid gap-0.5">
            {rows.map((row) => (
              <li key={row.title} className="flex justify-between gap-4">
                <span>{row.title}</span>
                <span>{row.label}</span>
              </li>
            ))}
          </ul>
        )}
        {rows
          .filter(
            (row) =>
              row.summary &&
              row.label !== "Unchanged" &&
              row.label !== "All normal"
          )
          .map((row) => (
            <p key={`${row.title}-summary`}>{row.summary}</p>
          ))}
      </TooltipContent>
    </Tooltip>
  )
}

export const ObservationChart = ({
  events,
}: {
  events: readonly ObservatoryHistoryEvent[]
}) => {
  const [now, setNow] = useState<number | null>(null)
  const scrollerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setNow(Date.now())
  }, [])

  const grid = useMemo(() => {
    if (now == null) return null
    const { today, weeks } = observationChartGrid(now)
    return {
      today,
      weeks,
      months: monthLabelsForGrid(weeks),
    }
  }, [now])

  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    scroller.scrollLeft = scroller.scrollWidth
  }, [grid])

  if (grid == null) {
    return (
      <div
        className="h-28 rounded-md border border-border bg-background"
        aria-hidden
      />
    )
  }

  const monthByWeek = new Map(
    grid.months.map((month) => [month.weekIndex, month.label])
  )

  return (
    <div
      ref={scrollerRef}
      className="overflow-x-auto rounded-md border border-border bg-background p-3"
      role="img"
      aria-label="Observations over the last year"
    >
      <div className="flex w-fit gap-1">
        <div className="w-6 shrink-0 text-[10px] leading-none text-muted-foreground">
          <div className="mb-1 h-2.5" />
          <div className="grid grid-rows-7 gap-1">
            {WEEKDAY_LABELS.map((label, index) => (
              <span key={`${label}-${index}`} className="h-2.5">
                {label}
              </span>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-1 flex gap-1">
            {grid.weeks.map((week, weekIndex) => (
              <span
                key={`month-${week[0]}`}
                className="relative h-2.5 w-2.5 shrink-0 text-[10px] leading-none text-muted-foreground"
              >
                {monthByWeek.get(weekIndex) ? (
                  <span className="absolute left-0 whitespace-nowrap">
                    {monthByWeek.get(weekIndex)}
                  </span>
                ) : null}
              </span>
            ))}
          </div>
          <div className="flex gap-1">
            {grid.weeks.map((week) => (
              <div key={week[0]} className="grid grid-rows-7 gap-1">
                {week.map((dayStart) => {
                  const dayEvents = eventsOnLocalDay(events, dayStart)
                  const mark = dayMark(
                    dayStart,
                    grid.today,
                    dayEvents.map((event) => event.state)
                  )
                  return (
                    <ChartCell
                      key={dayStart}
                      date={dayDateLabel(dayStart)}
                      mark={mark}
                      rows={CHART_ROWS.map((row) => {
                        const rowEvents = rowEventsForDay(dayEvents, row.id)
                        return {
                          title: row.title,
                          label: rowLabel(
                            rowStateForDay(dayEvents, row.id),
                            mark
                          ),
                          summary: rowEvents.at(-1)?.summary ?? null,
                        }
                      })}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
