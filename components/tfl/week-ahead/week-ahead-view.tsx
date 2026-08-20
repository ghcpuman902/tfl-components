"use client"

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { LineStrip } from "@/components/tfl/diagram/line-strip"
import type { LondonDay } from "@/lib/tfl/london-dates"
import type {
  WeekAheadLineRoute,
  WeekAheadStatusPayload,
} from "@/lib/tfl/week-ahead-data"
import { buildDayLineServiceState } from "@/lib/tfl/week-ahead-status"
import { cn } from "@/lib/utils"

/** Absolute diagram unit so station names land near page `text-base` (~16px). */
const HOMEPAGE_DIAGRAM_X = 8

type WeekAheadContextValue = {
  days: LondonDay[]
  selectedDay: LondonDay
  selectDay: (dateKey: string) => void
  status: WeekAheadStatusPayload | null
  setStatus: (status: WeekAheadStatusPayload) => void
}

const WeekAheadContext = createContext<WeekAheadContextValue | null>(null)

const useWeekAhead = (): WeekAheadContextValue => {
  const value = useContext(WeekAheadContext)
  if (!value) {
    throw new Error("WeekAhead components must be used within WeekAheadShell")
  }
  return value
}

type ShellProps = {
  days: LondonDay[]
  children: ReactNode
}

/**
 * Client shell: day controls + shared status bridge.
 * Route rows and status stream in as RSC children under Suspense.
 */
export const WeekAheadShell = ({ days, children }: ShellProps) => {
  const [selectedKey, setSelectedKey] = useState(() => days[0]?.dateKey ?? "")
  const [status, setStatus] = useState<WeekAheadStatusPayload | null>(null)

  const selectedDay =
    days.find((day) => day.dateKey === selectedKey) ?? days[0]!

  const value = useMemo<WeekAheadContextValue>(
    () => ({
      days,
      selectedDay,
      selectDay: setSelectedKey,
      status,
      setStatus,
    }),
    [days, selectedDay, status]
  )

  return (
    <WeekAheadContext.Provider value={value}>
      <section
        className="w-full max-w-full min-w-0 space-y-8"
        aria-labelledby="week-ahead-heading"
      >
        <div className="space-y-3">
          <h1
            id="week-ahead-heading"
            className="tfl-title text-3xl text-foreground sm:text-4xl"
          >
            This week ahead
          </h1>
          <p className="max-w-prose text-sm text-muted-foreground">
            Planned and live service for Tube, Elizabeth line, DLR, Overground,
            and Tram routes. Routes load first; live status overlays when ready.
          </p>
        </div>

        <DayControls />

        {status?.statusError ? (
          <p role="status" className="text-sm text-muted-foreground">
            Live status is unavailable right now. Routes still show in official
            colours — not as good service.
          </p>
        ) : null}

        {children}
      </section>
    </WeekAheadContext.Provider>
  )
}

/** Streamed from the server under Suspense — publishes status into the shell. */
export const WeekAheadStatusHydrator = ({
  status,
}: {
  status: WeekAheadStatusPayload
}) => {
  const { setStatus } = useWeekAhead()

  useEffect(() => {
    setStatus(status)
  }, [setStatus, status])

  return null
}

/** One line row: stations always; status overlay when the hydrator has run. */
export const WeekAheadLineRow = ({ route }: { route: WeekAheadLineRoute }) => {
  const { selectedDay, status } = useWeekAhead()

  const service =
    status && !status.statusError
      ? buildDayLineServiceState(
          route.spineIds,
          status.statusesByLineId[route.lineId] ?? [],
          selectedDay.startMs,
          selectedDay.endMs
        )
      : {
          kind: "good" as const,
          labels: [] as string[],
          segments: [],
          forceLabelIds: [] as string[],
          stationOutOfUseIds: [] as string[],
        }

  const statusLabel = service.labels[0]

  return (
    <article
      className="w-full min-w-0 space-y-2"
      aria-label={`${route.lineName}${statusLabel ? `: ${statusLabel}` : ""}`}
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2
          data-line={route.lineId}
          className="tfl-dark-line-text text-base font-semibold text-[var(--line-color)]"
        >
          {route.lineName}
        </h2>
        {statusLabel ? (
          <p className="text-sm text-muted-foreground">{statusLabel}</p>
        ) : null}
        {service.note ? (
          <p className="text-sm text-muted-foreground">{service.note}</p>
        ) : null}
        {route.routeError ? (
          <p className="text-sm text-muted-foreground">
            Route sequence unavailable
          </p>
        ) : null}
      </div>

      {route.stations.length > 0 ? (
        <LineStrip
          lineId={route.lineId}
          lineName={route.lineName}
          lineColor={route.lineColor}
          stations={route.stations}
          segments={service.segments}
          stationOutOfUseIds={service.stationOutOfUseIds}
          forceLabelIds={service.forceLabelIds}
          orientation="horizontal"
          x={HOMEPAGE_DIAGRAM_X}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          No outbound spine available for this line.
        </p>
      )}
    </article>
  )
}

const DayControls = () => {
  const { days, selectedDay, selectDay } = useWeekAhead()

  return (
    <div
      role="group"
      aria-label="Select day"
      className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8"
    >
      {days.map((day, index) => {
        const selected = day.dateKey === selectedDay.dateKey
        return (
          <button
            key={day.dateKey}
            type="button"
            aria-pressed={selected}
            aria-label={
              index <= 1
                ? `${day.label}, ${day.dayMonth}`
                : `${day.weekdayLong} ${day.dayMonth}`
            }
            onClick={() => selectDay(day.dateKey)}
            className={cn(
              "min-h-11 rounded-md px-2 py-2 text-left text-sm transition-colors",
              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              selected
                ? "bg-foreground text-background"
                : "bg-muted/60 text-foreground hover:bg-muted"
            )}
          >
            <span className="block leading-tight font-semibold">
              {index <= 1 ? day.label : day.weekdayLong}
            </span>
            <span
              className={cn(
                "mt-0.5 block text-xs",
                selected ? "text-background/80" : "text-muted-foreground"
              )}
            >
              {day.dayMonth}
            </span>
          </button>
        )
      })}
    </div>
  )
}
