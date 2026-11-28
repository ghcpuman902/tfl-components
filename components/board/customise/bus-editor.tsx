"use client"

import { useEffect, useRef } from "react"
import { XIcon } from "lucide-react"
import { EditorSearch } from "@/components/board/customise/editors"
import { OrderedLineList } from "@/components/board/customise/ordered-line-list"
import {
  HeightStepper,
  ICON_BUTTON,
  PanelTargetNote,
  SectionHeading,
  TEXT_LINK,
} from "@/components/board/customise/parts"
import type { CustomiseController } from "@/components/board/customise/types"
import {
  useBusStops,
  type BusStopInfo,
} from "@/components/board/customise/use-bus-stops"
import { BusNumberChip } from "@/components/tfl/arrivals/bus-number-chip"
import { RouteChipColumn } from "@/components/home/route-chip-column"
import { StopLetterBadge } from "@/components/tfl/arrivals/stop-letter-badge"
import { useDualPathArrivals } from "@/hooks/use-dual-path-arrivals"
import { busArrivalsRequest } from "@/lib/tfl/board-bus-stops"
import {
  addLine,
  moveLineToTop,
  panelShown,
  placeLine,
  removeLine,
} from "@/lib/tfl/board-customise"
import { dayRoutes } from "@/lib/tfl/homepage-live/search-groups"

const sameRoute = (row: { lineId?: string; lineName?: string }, route: string) =>
  (row.lineId ?? "").toLowerCase() === route.toLowerCase() ||
  (row.lineName ?? "").toLowerCase() === route.toLowerCase()

/** A stop as the search lists it: name, letter, towards, routes, ✕. */
const StopRow = ({
  id,
  stop,
  onRemove,
}: {
  id: string
  stop: BusStopInfo | undefined
  onRemove: () => void
}) => (
  <li className="flex min-h-14 items-start gap-1 border-b border-border py-2.5 last:border-b-0">
    <span className="flex min-w-0 flex-1 items-start gap-2">
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center text-lg leading-snug">
          <span className="truncate">{stop?.name ?? " "}</span>
          {stop?.letter ? (
            <StopLetterBadge
              letter={stop.letter}
              size="sm"
              className="ml-2 -translate-y-px"
            />
          ) : null}
        </span>
        <span className="block truncate text-sm text-muted-foreground">
          {stop?.context ?? " "}
        </span>
      </span>
      <RouteChipColumn
        routes={dayRoutes(stop?.routes ?? []).slice(0, 6)}
        className="max-w-[45%] pt-0.5"
      />
    </span>
    <button
      type="button"
      aria-label={`Remove ${stop?.name ?? id}${stop?.letter ? ` stop ${stop.letter}` : ""}`}
      className={`${ICON_BUTTON} -my-1.5 -mr-2.5`}
      onClick={onRemove}
    >
      <XIcon className="size-5" aria-hidden />
    </button>
  </li>
)

/**
 * Buses: add a stop (the homepage search, bus stops only), the stops
 * (nearest to the Trains station until the user changes them), the routes in
 * board order with a Hidden zone, Height.
 */
export const BusEditor = ({ api }: { api: CustomiseController }) => {
  const ids = api.busStops
  const { stops, routes, ready } = useBusStops(ids)
  // Only for each route's destination.
  const arrivals = useDualPathArrivals({
    ...busArrivalsRequest(ids.join(",")),
    siteScope: "board",
  })

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

  const on = busRoutes
    ? busRoutes.filter((route) => routes.includes(route))
    : routes
  const hidden = routes.filter((route) => !on.includes(route))
  // Every route in the usual order is no filter at all (the URL stays short).
  const save = (next: readonly string[]) =>
    setBusRoutes(
      next.length === routes.length &&
        next.every((route, index) => route === routes[index])
        ? undefined
        : [...next]
    )
  const item = (route: string) => ({
    name: `route ${route}`,
    body: (
      <>
        <BusNumberChip label={route} />
        {/* Wraps under itself, so the chip and the first line stay at the row's top. */}
        <span className="min-w-0 flex-1 text-sm leading-5 text-pretty text-muted-foreground">
          {arrivals.data.find((row) => sameRoute(row, route))?.destinationName}
        </span>
      </>
    ),
  })

  return (
    <>
      <div className="-mt-4">
        <EditorSearch
          api={api}
          mode="bus"
          placeholder="Add a bus stop"
          chosenIds={ids}
          onSelect={(hit) => {
            if (hit.kind === "bus" && !ids.includes(hit.id))
              api.setBusStops([...ids, hit.id])
          }}
        />
      </div>
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
        {api.busStopsCustom || api.panelTarget("bus") === "ready" ? null : (
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
          <p className="text-sm text-muted-foreground">No bus stop yet.</p>
        ) : null}
      </section>
      {routes.length > 0 ? (
        <section aria-labelledby="customise-bus-routes" className="space-y-1">
          <SectionHeading id="customise-bus-routes">
            Routes, in board order
          </SectionHeading>
          <OrderedLineList
            label="Routes, in board order"
            ids={on}
            flush
            align="top"
            item={item}
            onPlace={(route, index) => save(placeLine(on, route, index))}
            onTop={(route) => save(moveLineToTop(on, route))}
            hidden={{
              hint: "Drag a route here to hide it",
              ids: hidden,
              canHide: () => on.length > 1,
              onHide: (route) => save(removeLine(on, route)),
              onShow: (route) => save(addLine(on, route)),
            }}
          />
        </section>
      ) : null}
      {panelShown(api.layout, "bus") ? (
        <HeightStepper api={api} kind="bus" />
      ) : null}
    </>
  )
}
