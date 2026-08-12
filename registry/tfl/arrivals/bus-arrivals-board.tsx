import type { RealtimePrediction } from "tfl-ts"
import {
  ArrivalsBoardSkeleton,
  ArrivalsBoardView,
  resolveBusStopLetter,
  type ArrivalsBoardChromeProps,
  type ArrivalsBoardClassNames,
} from "@/components/tfl/arrivals/arrivals-board-view"
import {
  prepareBusArrivals,
  type BusArrivalsGroupBy,
  type BusArrivalsGroupSortBy,
  type BusArrivalsSortBy,
} from "@/lib/tfl/arrivals-prepare"

export type BusArrivalsBoardProps = ArrivalsBoardChromeProps & {
  /**
   * Normalised arrivals from `tfl.stopPoint.getArrivals` (`RealtimePrediction[]`).
   * Missing/`undefined` treated as an empty list. The board sorts this itself.
   */
  data?: readonly RealtimePrediction[]
  /**
   * `none` (default) is one flat list in arrival-time order, route chip on
   * every row. `route` groups by route with natural numeric headers.
   */
  groupBy?: BusArrivalsGroupBy
  /** Arrival order. Default `timeToStation` (global when flat, per route when grouped). */
  sortBy?: BusArrivalsSortBy
  /** Route-group order when `groupBy="route"`. Default `route` (9 before 18 before 205). */
  groupSortBy?: BusArrivalsGroupSortBy
  /** Cap on prediction rows after ordering. Headers do not count. */
  maxRows?: number
  /**
   * Visible arrivals per page. Grouped: per route, arrows on the route header.
   * Flat: the whole list, arrows in a trailing tile. Default 3.
   */
  pageSize?: number
  /**
   * Root classes, merged over the board container
   * (`data-slot="arrivals-board"`). Use `classNames` for board-width
   * arrangements — the root is the `arrivals` container itself.
   */
  className?: string
  /**
   * Layout-level class overrides for generated parts. Grouped: `groups`
   * arranges route sections against the board container (`/arrivals`).
   * Flat: `rows` styles the single time-ordered list. `subgroups` /
   * `subgroup` are rail-only — bus routes have no bound level.
   */
  classNames?: ArrivalsBoardClassNames
}

export const BusArrivalsBoardSkeleton = ({
  className,
}: {
  className?: string
} = {}) => <ArrivalsBoardSkeleton mode="bus" className={className} />

/**
 * Bus arrivals board. Default is a flat time-ordered list with a route chip
 * on every row and the stop letter on the header. Fetching, caching, and
 * stop discovery stay in the app.
 *
 * Pass `groupBy="route"` for route sections (homepage and other explicit
 * grouped presentations).
 */
export const BusArrivalsBoard = ({
  data,
  groupBy = "none",
  sortBy = "timeToStation",
  groupSortBy = "route",
  maxRows = 16,
  pageSize = 3,
  stopLetter,
  loading = false,
  error = null,
  className,
  classNames,
  ...chrome
}: BusArrivalsBoardProps) => {
  const rows = data ?? []
  if (loading && rows.length === 0 && !error) {
    return <BusArrivalsBoardSkeleton className={className} />
  }

  const prepared = prepareBusArrivals({
    data: rows,
    groupBy,
    sortBy,
    groupSortBy,
    maxRows,
  })
  const resolvedStopLetter = resolveBusStopLetter(stopLetter, rows)

  return (
    <ArrivalsBoardView
      mode="bus"
      prepared={prepared}
      resolvedStopLetter={resolvedStopLetter}
      stopLetter={stopLetter}
      loading={loading}
      error={error}
      pageSize={pageSize}
      className={className}
      classNames={classNames}
      {...chrome}
    />
  )
}

export type { ArrivalsBoardClassNames }
export type {
  BusArrivalsGroupBy,
  BusArrivalsGroupSortBy,
  BusArrivalsSortBy,
} from "@/lib/tfl/arrivals-prepare"
