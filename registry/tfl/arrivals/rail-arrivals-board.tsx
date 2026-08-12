import type { RealtimePrediction } from "tfl-ts"
import {
  ArrivalsBoardSkeleton,
  ArrivalsBoardView,
  type ArrivalsBoardChromeProps,
} from "@/components/tfl/arrivals/arrivals-board-view"
import {
  prepareRailArrivals,
  type RailArrivalsBoundSortBy,
  type RailArrivalsLine,
  type RailArrivalsLineSortBy,
  type RailArrivalsSortBy,
} from "@/lib/tfl/arrivals-prepare"

export type RailArrivalsBoardProps = ArrivalsBoardChromeProps & {
  /**
   * Normalised arrivals from `tfl.stopPoint.getArrivals` (`RealtimePrediction[]`).
   * Missing/`undefined` treated as an empty list. The board sorts this itself.
   */
  data?: readonly RealtimePrediction[]
  /**
   * Optional serving lines for this stop. Lines with no predictions still
   * render (empty "No information" row) in canonical `LINE_ORDER`.
   * Order in this array is ignored unless `lineSortBy="source"`.
   */
  lines?: readonly RailArrivalsLine[]
  /** Arrival order within each bound. Default `timeToStation`. */
  sortBy?: RailArrivalsSortBy
  /** Line section order. Default `canonical` (`LINE_ORDER`). */
  lineSortBy?: RailArrivalsLineSortBy
  /** Bound order within a line. Default `compass` (West→East, North→South). */
  boundSortBy?: RailArrivalsBoundSortBy
  /**
   * Max predictions kept per compass bound after ordering. Does not drop later
   * lines. Headers and empty rows do not count. Default 16.
   */
  maxRows?: number
  /**
   * Visible arrivals per bound. Further trains page behind hover arrows on the
   * bound label. Default 3.
   */
  pageSize?: number
}

export const RailArrivalsBoardSkeleton = () => (
  <ArrivalsBoardSkeleton mode="rail" />
)

/**
 * Rail arrivals board. Groups by line, then compass bound. Fetching, caching,
 * and polling stay in the app.
 *
 * Defaults: canonical `LINE_ORDER` (empty lines keep their slot), compass
 * bound order, `timeToStation` within each bound. Optional `lines[].bounds`
 * seeds empty bound groups from station metadata. Each bound shows `pageSize`
 * trains; hover the bound group to page the rest.
 */
export const RailArrivalsBoard = ({
  data,
  lines,
  sortBy = "timeToStation",
  lineSortBy = "canonical",
  boundSortBy = "compass",
  maxRows = 16,
  pageSize = 3,
  loading = false,
  error = null,
  ...chrome
}: RailArrivalsBoardProps) => {
  const rows = data ?? []
  if (loading && rows.length === 0 && !error) {
    return <RailArrivalsBoardSkeleton />
  }

  const prepared = prepareRailArrivals({
    data: rows,
    lines,
    sortBy,
    lineSortBy,
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
      {...chrome}
    />
  )
}

export type { RailArrivalsLine }
export type {
  RailArrivalsBoundSortBy,
  RailArrivalsLineSortBy,
  RailArrivalsSortBy,
} from "@/lib/tfl/arrivals-prepare"
