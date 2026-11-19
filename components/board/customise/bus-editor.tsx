"use client"

import { useEffect, useRef } from "react"
import { PlusIcon, XIcon } from "lucide-react"
import { BoardPlaceSearch } from "@/components/board/board-place-search"
import {
  HeightStepper,
  ICON_BUTTON,
  PanelTargetNote,
  SQUARE_BUTTON,
  SQUARE_CHECK,
  SectionHeading,
  TEXT_LINK,
} from "@/components/board/customise/parts"
import type { CustomiseController } from "@/components/board/customise/types"
import {
  useBusStops,
  type BusStopInfo,
} from "@/components/board/customise/use-bus-stops"
import { BusArrivalsBoard } from "@/components/tfl/arrivals/bus-arrivals-board"
import { BusNumberChip } from "@/components/tfl/arrivals/bus-number-chip"
import { StopLetterBadge } from "@/components/tfl/arrivals/stop-letter-badge"
import { useDualPathArrivals } from "@/hooks/use-dual-path-arrivals"
import { filterBusRoutes } from "@/lib/tfl/board-bus-stops"
import { cn } from "@/lib/utils"

const sameRoute = (row: { lineId?: string; lineName?: string }, route: string) =>
  (row.lineId ?? "").toLowerCase() === route.toLowerCase() ||
  (row.lineName ?? "").toLowerCase() === route.toLowerCase()

/** Which of the listed stops a route calls at, in words. */
const stopsNote = (route: string, stops: readonly (BusStopInfo | undefined)[]) => {
  if (stops.length < 2) return null
  const at = stops.filter((stop) => stop?.routes.includes(route))
  if (at.length === stops.length) return stops.length === 2 ? "both stops" : "all stops"
  const letters = at.flatMap((stop) => (stop?.letter ? [stop.letter] : []))
  if (letters.length === 0) return null
  return `${letters.length === 1 ? "stop" : "stops"} ${letters.join(", ")}`
}

const StopRow = ({
  id,
  stop,
  onRemove,
}: {
  id: string
  stop: BusStopInfo | undefined
  onRemove: () => void
}) => (
  <li className="flex items-center border-b border-border last:border-b-0">
    <span className="flex min-h-12 min-w-0 flex-1 flex-col justify-center py-1">
      <span className="flex items-center gap-1.5 text-sm font-medium">
        <span className="truncate">{stop?.name ?? id}</span>
        {stop?.letter ? <StopLetterBadge letter={stop.letter} size="sm" /> : null}
      </span>
      {stop?.context ? (
        <span className="truncate text-sm text-muted-foreground">
          {stop.context}
        </span>
      ) : null}
    </span>
    <button
      type="button"
      aria-label={`Remove ${stop?.name ?? id}${stop?.letter ? ` stop ${stop.letter}` : ""}`}
      className={ICON_BUTTON}
      onClick={onRemove}
    >
      <XIcon className="size-5" aria-hidden />
    </button>
  </li>
)

/**
 * Buses: the live board for the chosen stops, the stops (nearest to the
 * default place until the user changes them), the routes at them, Height.
 */
export const BusEditor = ({ api }: { api: CustomiseController }) => {
  const ids = api.busStops
  const { stops, routes, ready } = useBusStops(ids)
  const arrivals = useDualPathArrivals({
    stopPointId: ids[0] ?? "",
    stopPointIds: ids,
    siteEachStop: true,
    siteScope: "board",
  })
  const shown = filterBusRoutes(arrivals.data, api.busRoutes)

  // A filter lists the routes to show; routes a new stop brings join it.
  // Counted only once every stop is read, so a slow read adds nothing.
  const seen = useRef<readonly string[] | null>(null)
  const { busRoutes, setBusRoutes } = api
  const routesKey = routes.join(",")
  useEffect(() => {
    if (!ready) return
    const all = routesKey ? routesKey.split(",") : []
    const before = seen.current
    seen.current = all
    if (!before || !busRoutes) return
    const fresh = all.filter((route) => !before.includes(route))
    if (fresh.length > 0) setBusRoutes([...busRoutes, ...fresh])
  }, [ready, routesKey, busRoutes, setBusRoutes])

  const isOn = (route: string) => !busRoutes || busRoutes.includes(route)
  const onCount = routes.filter(isOn).length
  const toggleRoute = (route: string, on: boolean) => {
    const next = on
      ? [...(busRoutes ?? routes), route]
      : (busRoutes ?? routes).filter((item) => item !== route)
    setBusRoutes(routes.every((item) => next.includes(item)) ? undefined : next)
  }

  const preview = (
    <section aria-labelledby="customise-bus-board" className="space-y-1">
      <SectionHeading id="customise-bus-board">On the board</SectionHeading>
      <div className="border-y border-border py-2">
        <BusArrivalsBoard
          stopName={arrivals.data[0]?.stationName ?? stops[0]?.name ?? "Bus"}
          stopPointId={ids[0]}
          headingLevel={2}
          data={shown}
          now={arrivals.fetchedAt ?? undefined}
          groupBy={api.busRoutes?.length ? "none" : "route"}
          pageSize={api.layout.heights.bus}
          loading={ids.length > 0 && arrivals.loading}
          error={arrivals.fetchError}
        />
      </div>
    </section>
  )

  if (api.busAdding) {
    return (
      <>
        {preview}
        <section className="space-y-1">
          <SectionHeading>
            <label htmlFor="customise-bus-add">Add a bus stop</label>
          </SectionHeading>
          <BoardPlaceSearch
            kind="bus"
            inputId="customise-bus-add"
            placeholder="Stop name or street"
            emptyMessage="No bus stops matched that search."
            addedIds={ids}
            onSelect={(place) => api.setBusStops([...ids, place.id])}
          />
        </section>
      </>
    )
  }

  return (
    <>
      {preview}
      <section aria-labelledby="customise-bus-stops" className="space-y-1">
        <div className="flex items-center justify-between gap-3">
          <SectionHeading id="customise-bus-stops">Stops</SectionHeading>
          {api.busStopsCustom ? (
            <button
              type="button"
              className={TEXT_LINK}
              onClick={api.resetBusStops}
            >
              Reset to nearest
            </button>
          ) : null}
        </div>
        {api.busStopsCustom ? null : api.panelTarget("bus") === "ready" ? (
          <p className="text-sm text-muted-foreground">
            Nearest to {api.stationName}. Remove or add to make your own.
          </p>
        ) : (
          <PanelTargetNote api={api} kind="bus" />
        )}
        {ids.length > 0 ? (
          <ul className="border-y border-border">
            {ids.map((id, index) => (
              <StopRow
                key={id}
                id={id}
                stop={stops[index]}
                onRemove={() =>
                  api.setBusStops(ids.filter((item) => item !== id))
                }
              />
            ))}
          </ul>
        ) : api.busStopsCustom ? (
          <p className="text-sm text-muted-foreground">No bus stop yet</p>
        ) : null}
        <div className="pt-2">
          <button
            type="button"
            className={cn(SQUARE_BUTTON, "w-full justify-start")}
            onClick={() => api.setBusAdding(true)}
          >
            <PlusIcon className="size-4" aria-hidden />
            Add a bus stop
          </button>
        </div>
      </section>
      {routes.length > 0 ? (
        <section aria-labelledby="customise-bus-routes" className="space-y-1">
          <SectionHeading id="customise-bus-routes">
            Routes at these stops
          </SectionHeading>
          <ul className="border-y border-border">
            {routes.map((route) => {
              const on = isOn(route)
              const destination = arrivals.data.find((row) =>
                sameRoute(row, route)
              )?.destinationName
              const note = on
                ? [destination, stopsNote(route, stops)]
                    .filter(Boolean)
                    .join(" · ")
                : "Not shown"
              return (
                <li key={route} className="border-b border-border last:border-b-0">
                  <label className="flex min-h-12 items-center gap-3">
                    <input
                      type="checkbox"
                      className={SQUARE_CHECK}
                      checked={on}
                      disabled={on && onCount === 1}
                      aria-label={`Show route ${route}`}
                      onChange={(event) =>
                        toggleRoute(route, event.target.checked)
                      }
                    />
                    <BusNumberChip
                      label={route}
                      className={cn(!on && "opacity-30")}
                    />
                    <span
                      className={cn(
                        "min-w-0 flex-1 truncate text-sm",
                        !on && "text-muted-foreground"
                      )}
                    >
                      {note}
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}
      <HeightStepper api={api} kind="bus" />
    </>
  )
}
