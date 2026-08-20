import type { RealtimePrediction } from "tfl-ts"
import {
  ArrivalsBoardSkeleton,
  ArrivalsBoardView,
  resolveArrivalsHeading,
  type ArrivalsBoardChromeProps,
  type ArrivalsBoardClassNames,
} from "@/components/tfl/arrivals/arrivals-board-view"
import type { BusStopDisruption } from "@/lib/tfl/prepare-bus-stop-disruptions"
import {
  prepareBusArrivals,
  type BusArrivalsGroupBy,
  type BusArrivalsGroupSortBy,
  type BusArrivalsSortBy,
} from "@/lib/tfl/arrivals-prepare"
import { RIVER_ARRIVALS_EMPTY_COPY } from "@/lib/tfl/arrivals-empty"
import { filterRiverBusArrivals, isRiverBusLineId } from "@/lib/tfl/river-bus"
import type { DisplayBehaviour } from "@/lib/tfl/unattended-sequence"

export type RiverBusArrivalsBoardProps = ArrivalsBoardChromeProps & {
  /**
   * Normalised arrivals from `tfl.stopPoint.getArrivals` (`RealtimePrediction[]`).
   * Missing/`undefined` treated as an empty list. The board sorts this itself.
   * Poll the pier (`NaptanFerryPort`, `930G…`), not a berth.
   */
  data?: readonly RealtimePrediction[]
  /**
   * Per-route disruption warnings for this pier. Build with
   * `prepareBusStopDisruptions` from `stopPoint.getDisruption` output —
   * fetching stays in your app/demo, same as `data`.
   */
  disruptions?: readonly BusStopDisruption[]
  /**
   * `none` (default) is one flat list in arrival-time order, route chip on
   * every row. `route` groups by river-bus line.
   */
  groupBy?: BusArrivalsGroupBy
  /** Arrival order. Default `timeToStation` (global when flat, per route when grouped). */
  sortBy?: BusArrivalsSortBy
  /** Route-group order when `groupBy="route"`. Default `route` (RB1 before RB6). */
  groupSortBy?: BusArrivalsGroupSortBy
  /** Cap on prediction rows after ordering. Headers do not count. */
  maxRows?: number
  /**
   * Fetch timestamp (ms) captured with `data`. Drops predictions whose
   * `timeToLive` has already expired. Must not be a ticking clock —
   * river `timeToLive` is a ~1–2 min feed TTL, not arrival expiry.
   * Omit to skip this filter.
   */
  now?: number
  /**
   * Visible arrivals per page. Grouped: per route, arrows on the route header.
   * Flat: the whole list, arrows always visible in a trailing tile. Once
   * there is more than one page, the list locks to this height. Default 3.
   */
  pageSize?: number
  behaviour?: DisplayBehaviour
  pinFirst?: boolean
  dwellMs?: number
  startDelayMs?: number
  idleReturnMs?: number
  className?: string
  classNames?: ArrivalsBoardClassNames
}

export const RiverBusArrivalsBoardSkeleton = ({
  className,
  stopName,
}: {
  className?: string
  stopName?: string
} = {}) => (
  <ArrivalsBoardSkeleton
    mode="river"
    className={className}
    stopName={stopName}
  />
)

/**
 * River bus arrivals board. Default is a flat time-ordered list with a
 * river-blue route chip on every row. Fetching stays in the app.
 *
 * Grouping reuses `prepareBusArrivals` — river has no compass-bound level,
 * same shape as bus routes.
 */
export const RiverBusArrivalsBoard = ({
  data,
  disruptions,
  groupBy = "none",
  sortBy = "timeToStation",
  groupSortBy = "route",
  maxRows = 16,
  now,
  pageSize = 3,
  behaviour,
  pinFirst,
  dwellMs,
  startDelayMs,
  idleReturnMs,
  loading = false,
  error = null,
  emptyMessage = RIVER_ARRIVALS_EMPTY_COPY,
  className,
  classNames,
  ...chrome
}: RiverBusArrivalsBoardProps) => {
  const rows = filterRiverBusArrivals(data)
  const heading = resolveArrivalsHeading(chrome.stopName, rows)
  if (loading && rows.length === 0 && !error) {
    return (
      <RiverBusArrivalsBoardSkeleton className={className} stopName={heading} />
    )
  }

  const prepared = prepareBusArrivals({
    data: rows,
    groupBy,
    sortBy,
    groupSortBy,
    now,
    maxRows,
  })
  const riverDisruptions = (disruptions ?? []).filter((item) =>
    isRiverBusLineId(item.lineId)
  )

  return (
    <ArrivalsBoardView
      mode="river"
      prepared={prepared}
      disruptions={riverDisruptions}
      loading={loading}
      error={error}
      emptyMessage={emptyMessage}
      pageSize={pageSize}
      behaviour={behaviour}
      pinFirst={pinFirst}
      dwellMs={dwellMs}
      startDelayMs={startDelayMs}
      idleReturnMs={idleReturnMs}
      className={className}
      classNames={classNames}
      {...chrome}
      stopName={heading}
    />
  )
}

export type { ArrivalsBoardClassNames }
export type { BusStopDisruption } from "@/lib/tfl/prepare-bus-stop-disruptions"
export { prepareBusStopDisruptions } from "@/lib/tfl/prepare-bus-stop-disruptions"
export type {
  BusArrivalsGroupBy,
  BusArrivalsGroupSortBy,
  BusArrivalsSortBy,
} from "@/lib/tfl/arrivals-prepare"
export type { RealtimePrediction } from "tfl-ts"
