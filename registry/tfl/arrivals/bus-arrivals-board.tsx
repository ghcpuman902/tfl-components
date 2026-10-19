import type { RealtimePrediction } from "tfl-ts"
import {
  ArrivalsBoardSkeleton,
  ArrivalsBoardView,
  resolveArrivalsHeading,
  resolveBusStopLetter,
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
import type { DisplayBehaviour } from "@/lib/tfl/unattended-sequence"

export type BusArrivalsBoardProps = ArrivalsBoardChromeProps & {
  /**
   * Normalised arrivals from `tfl.stopPoint.getArrivals` (`RealtimePrediction[]`).
   * Missing/`undefined` treated as an empty list. The board sorts this itself.
   */
  data?: readonly RealtimePrediction[]
  /**
   * Per-route disruption warnings for this stop. Build with
   * `prepareBusStopDisruptions` from `stopPoint.getDisruption` output —
   * fetching stays in your app/demo, same as `data`.
   */
  disruptions?: readonly BusStopDisruption[]
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
   * Current time (ms) — drops predictions whose `timeToLive` has already
   * expired (see `RailArrivalsBoard`'s `now`; the same trap can apply to bus
   * predictions). Pass `Date.now()` captured alongside `data` at fetch time.
   * Omit to skip this filter.
   */
  now?: number
  /**
   * Visible arrivals per page. Grouped: per route, arrows on the route header.
   * Flat: the whole list, arrows always visible in a trailing tile. Once
   * there is more than one page, the list locks to this height (dashes +
   * end-of-list message on a short last page). Default 3.
   */
  pageSize?: number
  /** Interactive pager vs unattended auto-advance. Default interactive. */
  behaviour?: DisplayBehaviour
  /** Unattended: keep the first arrival visible while later slots rotate. */
  pinFirst?: boolean
  dwellMs?: number
  startDelayMs?: number
  /** Interactive: return to page 1 after this many idle milliseconds. */
  idleReturnMs?: number
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
  stopName,
  stopLetter,
}: {
  className?: string
  stopName?: string
  stopLetter?: string
} = {}) => (
  <ArrivalsBoardSkeleton
    mode="bus"
    className={className}
    stopName={stopName}
    stopLetter={stopLetter}
  />
)

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
  stopLetter,
  loading = false,
  error = null,
  className,
  classNames,
  ...chrome
}: BusArrivalsBoardProps) => {
  const rows = data ?? []
  const heading = resolveArrivalsHeading(chrome.stopName, rows)
  if (loading && rows.length === 0 && !error) {
    return (
      <BusArrivalsBoardSkeleton
        className={className}
        stopName={heading}
        stopLetter={stopLetter}
      />
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
  const resolvedStopLetter = resolveBusStopLetter(stopLetter, rows)

  return (
    <ArrivalsBoardView
      mode="bus"
      prepared={prepared}
      resolvedStopLetter={resolvedStopLetter}
      disruptions={disruptions}
      stopLetter={stopLetter}
      loading={loading}
      error={error}
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
/**
 * Re-exported so `data` and `tfl.stopPoint.getArrivals()` can be typed from
 * this one module — no separate `tfl-ts` import to keep in sync, no cast.
 */
export type { RealtimePrediction } from "tfl-ts"
