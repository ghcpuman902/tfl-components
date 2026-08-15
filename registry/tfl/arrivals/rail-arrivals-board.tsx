import type { RealtimePrediction } from "tfl-ts"
import { RAIL_ARRIVALS_DEFAULT_PAGE_SIZE } from "@/lib/tfl/arrivals-defaults"
import {
  ArrivalsBoardSkeleton,
  ArrivalsBoardView,
  type ArrivalsBoardChromeProps,
  type ArrivalsBoardClassNames,
} from "@/components/tfl/arrivals/arrivals-board-view"
import {
  prepareRailArrivals,
  type RailArrivalsBoundSortBy,
  type RailArrivalsLine,
  type RailArrivalsLineGroup,
  type RailArrivalsLineSortBy,
  type RailArrivalsSortBy,
} from "@/lib/tfl/arrivals-prepare"

export { RAIL_ARRIVALS_DEFAULT_PAGE_SIZE } from "@/lib/tfl/arrivals-defaults"

export type RailArrivalsBoardProps = ArrivalsBoardChromeProps & {
  /**
   * Normalised arrivals from `tfl.stopPoint.getArrivals` (`RealtimePrediction[]`).
   * Missing/`undefined` treated as an empty list. The board sorts this itself.
   */
  data?: readonly RealtimePrediction[]
  /**
   * Optional serving lines for this stop. Lines with no predictions still
   * render (empty "No information" row) in canonical `LINE_ORDER`.
   * Order in this array is ignored unless `lineSortBy="source"` — use
   * `lineOrder` for an explicit section order.
   */
  lines?: readonly RailArrivalsLine[]
  /**
   * Merge listed line ids into one section (shared platforms). Off by default.
   * Each row keeps its originating `lineId` so mixed-line groups can show a
   * line chip. Groups with fewer than two ids are ignored.
   */
  lineGroups?: readonly RailArrivalsLineGroup[]
  /** Arrival order within each bound. Default `timeToStation`. */
  sortBy?: RailArrivalsSortBy
  /** Line section order. Default `canonical` (`LINE_ORDER`). */
  lineSortBy?: RailArrivalsLineSortBy
  /**
   * Explicit line section order. Listed lines rank by list position; unlisted
   * lines follow, canonical among themselves. Ordering only — does not seed
   * or hide lines. When set, overrides `lineSortBy`.
   */
  lineOrder?: readonly string[]
  /** Bound order within a line. Default `compass` (West→East, North→South). */
  boundSortBy?: RailArrivalsBoundSortBy
  /**
   * Max predictions kept per compass bound after ordering. Does not drop later
   * lines. Headers and empty rows do not count. Default 16.
   */
  maxRows?: number
  /**
   * Visible arrivals per bound. Further trains page behind hover arrows on the
   * bound label. Default 3. Overridden per line by `pageSizeByLine`.
   */
  pageSize?: number
  /**
   * ID-keyed rows-per-bound override. Falls back to `pageSize` (then the
   * default) for lines not listed. Each value applies to every bound on that
   * line.
   */
  pageSizeByLine?: Readonly<Record<string, number>>
  /**
   * Root classes, merged over the board container
   * (`data-slot="arrivals-board"`). Use `classNames` for board-width
   * arrangements — the root is the `arrivals` container itself.
   */
  className?: string
  /**
   * Layout-level class overrides for generated parts. `groups` arranges the
   * line sections against the board container (`/arrivals`); `subgroups`
   * arranges bounds against their own line section (`/arrivals-group`), so a
   * narrow line column keeps its bounds stacked even on a wide board.
   */
  classNames?: ArrivalsBoardClassNames
}

export const RailArrivalsBoardSkeleton = ({
  className,
  stopName,
}: {
  className?: string
  stopName?: string
} = {}) => (
  <ArrivalsBoardSkeleton mode="rail" className={className} stopName={stopName} />
)

/**
 * Rail arrivals board. Groups by line (or `lineGroups` merge), then compass
 * bound or platform. Fetching, caching, and polling stay in the app.
 *
 * Defaults: canonical `LINE_ORDER` (empty lines keep their slot), compass
 * bound order, `timeToStation` within each bound. Optional `lines[].bounds`
 * seeds empty bound groups from station metadata. Each bound shows `pageSize`
 * trains (or `pageSizeByLine[lineId]`); hover the bound group to page the rest.
 * Uniform platforms hoist into the bound heading.
 */
export const RailArrivalsBoard = ({
  data,
  lines,
  lineGroups,
  sortBy = "timeToStation",
  lineSortBy = "canonical",
  lineOrder,
  boundSortBy = "compass",
  maxRows = 16,
  pageSize = RAIL_ARRIVALS_DEFAULT_PAGE_SIZE,
  pageSizeByLine,
  loading = false,
  error = null,
  className,
  classNames,
  ...chrome
}: RailArrivalsBoardProps) => {
  const rows = data ?? []
  if (loading && rows.length === 0 && !error) {
    return (
      <RailArrivalsBoardSkeleton
        className={className}
        stopName={chrome.stopName}
      />
    )
  }

  const prepared = prepareRailArrivals({
    data: rows,
    lines,
    lineGroups,
    sortBy,
    lineSortBy,
    lineOrder,
    boundSortBy,
    maxRows,
  })

  return (
    <ArrivalsBoardView
      mode="rail"
      prepared={prepared}
      loading={loading}
      error={error}
      pageSize={pageSize}
      pageSizeByLine={pageSizeByLine}
      className={className}
      classNames={classNames}
      {...chrome}
    />
  )
}

export type { ArrivalsBoardClassNames, RailArrivalsLine, RailArrivalsLineGroup }
export type {
  RailArrivalsBoundSortBy,
  RailArrivalsLineSortBy,
  RailArrivalsSortBy,
} from "@/lib/tfl/arrivals-prepare"
