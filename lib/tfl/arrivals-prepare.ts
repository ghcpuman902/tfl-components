import { normalizeLineId, type RealtimePrediction } from "tfl-ts"
import { DEFAULT_MAX_ROWS } from "@/lib/tfl/arrivals-defaults"
import {
  compareArrivalsBounds,
  formatArrivalsBoundLabel,
  normalizeArrivalsBoundId,
  parseArrivalsPlatformLabel,
  parseCompassBoundId,
  type ArrivalsBoundId,
} from "@/lib/tfl/arrivals-bound-sort"
import { compareArrivalsLines } from "@/lib/tfl/arrivals-line-sort"
import { compareBusRouteNames } from "@/lib/tfl/arrivals-route-sort"

export { DEFAULT_MAX_ROWS } from "@/lib/tfl/arrivals-defaults"

export type RailArrivalsSortBy = "timeToStation" | "source"
export type RailArrivalsLineSortBy = "canonical" | "source"
export type RailArrivalsBoundSortBy = "compass" | "source"

export type BusArrivalsGroupBy = "none" | "route"
export type BusArrivalsSortBy = "timeToStation" | "source"
export type BusArrivalsGroupSortBy = "route" | "source"

export type RailArrivalsLine = {
  lineId: string
  lineName: string
  modeName?: string
  /**
   * Station metadata: compass bounds this line serves at the stop.
   * When set, those bound groups still render (with "No information") even if
   * no arrival currently carries that platform prefix. Arrival-only boards omit
   * missing bounds — that is intentional.
   */
  bounds?: readonly ArrivalsBoundId[]
}

export type IndexedArrival = {
  arrival: RealtimePrediction
  sourceIndex: number
}

export type ArrivalsPreparedRow = {
  key: string
  arrival: RealtimePrediction
  sourceIndex: number
}

export type ArrivalsPreparedBound = {
  key: string
  label: string | null
  /** True when this bound was empty before maxRows (metadata seed). */
  seededEmpty: boolean
  rows: ArrivalsPreparedRow[]
}

export type ArrivalsPreparedGroup = {
  key: string
  lineId: string
  lineName: string
  modeName?: string
  kind: "rail-line" | "bus-route"
  hasInformation: boolean
  /** True when the group had no predictions before maxRows. */
  seededEmpty: boolean
  bounds: ArrivalsPreparedBound[]
}

export type ArrivalsPreparedBoard = {
  layout: "grouped" | "flat"
  groups: ArrivalsPreparedGroup[]
  rows: ArrivalsPreparedRow[]
}

export const indexArrivals = (
  data: readonly RealtimePrediction[] | undefined
): IndexedArrival[] =>
  (data ?? []).map((arrival, sourceIndex) => ({ arrival, sourceIndex }))

export const compareIndexedByTime = (
  a: IndexedArrival,
  b: IndexedArrival
): number => {
  const timeDiff =
    (a.arrival.timeToStation ?? 0) - (b.arrival.timeToStation ?? 0)
  if (timeDiff !== 0) return timeDiff
  return a.sourceIndex - b.sourceIndex
}

export const compareIndexedBySource = (
  a: IndexedArrival,
  b: IndexedArrival
): number => a.sourceIndex - b.sourceIndex

const sortIndexed = (
  items: readonly IndexedArrival[],
  sortBy: "timeToStation" | "source"
): IndexedArrival[] =>
  [...items].sort(
    sortBy === "source" ? compareIndexedBySource : compareIndexedByTime
  )

/** TfL sometimes repeats `id` in one bound; `sourceIndex` keeps React keys unique. */
const rowKey = (item: IndexedArrival): string => {
  const identity =
    item.arrival.id ??
    item.arrival.vehicleId ??
    item.arrival.lineId ??
    "row"
  return `${identity}-${item.sourceIndex}`
}

const toRow = (item: IndexedArrival): ArrivalsPreparedRow => ({
  key: rowKey(item),
  arrival: item.arrival,
  sourceIndex: item.sourceIndex,
})

const lineKeyOf = (arrival: RealtimePrediction): string =>
  arrival.lineId || arrival.lineName || "unknown"

const resolveExpectedBounds = (
  bounds: readonly ArrivalsBoundId[] | undefined
): ArrivalsBoundId[] => {
  if (!bounds?.length) return []
  const seen = new Set<ArrivalsBoundId>()
  const resolved: ArrivalsBoundId[] = []
  for (const value of bounds) {
    const id = normalizeArrivalsBoundId(value)
    if (!id || seen.has(id)) continue
    seen.add(id)
    resolved.push(id)
  }
  return resolved
}

const flattenGroups = (
  groups: readonly ArrivalsPreparedGroup[]
): ArrivalsPreparedRow[] =>
  groups.flatMap((group) => group.bounds.flatMap((bound) => bound.rows))

/**
 * Per-bound / per-route cap. A global walk would spend the budget on the
 * first groups and drop later lines or routes.
 */
const limitRowsPerBound = (
  groups: readonly ArrivalsPreparedGroup[],
  maxRows: number
): ArrivalsPreparedGroup[] =>
  groups.map((group) => {
    const bounds = group.bounds.map((bound) => ({
      ...bound,
      rows: bound.rows.slice(0, maxRows),
    }))
    return {
      ...group,
      bounds,
      hasInformation: bounds.some((bound) => bound.rows.length > 0),
    }
  })

/** Visible slice for bound-group pagination. `pageSize <= 0` shows every row. */
export const sliceBoundPage = (
  rows: readonly ArrivalsPreparedRow[],
  page: number,
  pageSize: number
): {
  rows: ArrivalsPreparedRow[]
  page: number
  pageCount: number
  /** Empty tiles to keep a multi-page bound at `pageSize` height. */
  padCount: number
} => {
  if (pageSize <= 0 || rows.length <= pageSize) {
    return { rows: [...rows], page: 0, pageCount: 1, padCount: 0 }
  }
  const pageCount = Math.ceil(rows.length / pageSize)
  const safePage = Math.min(Math.max(0, page), pageCount - 1)
  const start = safePage * pageSize
  const visible = rows.slice(start, start + pageSize)
  return {
    rows: visible,
    page: safePage,
    pageCount,
    padCount: pageSize - visible.length,
  }
}

/** Every page for a scroll-snap track. Reuses `sliceBoundPage` per index. */
export const chunkBoundPages = (
  rows: readonly ArrivalsPreparedRow[],
  pageSize: number
): {
  pages: { rows: ArrivalsPreparedRow[]; padCount: number }[]
  pageCount: number
} => {
  const { pageCount } = sliceBoundPage(rows, 0, pageSize)
  return {
    pageCount,
    pages: Array.from({ length: pageCount }, (_, index) => {
      const { rows: pageRows, padCount } = sliceBoundPage(rows, index, pageSize)
      return { rows: pageRows, padCount }
    }),
  }
}

type LineBucket = {
  lineId: string
  lineName: string
  modeName?: string
  expectedBounds: ArrivalsBoundId[]
  seededEmpty: boolean
  items: IndexedArrival[]
  firstSourceIndex: number
}

const collectRailLines = (
  indexed: readonly IndexedArrival[],
  expectedLines: readonly RailArrivalsLine[]
): LineBucket[] => {
  const byLine = new Map<string, LineBucket>()

  for (const item of indexed) {
    const key = lineKeyOf(item.arrival)
    const existing = byLine.get(key)
    if (existing) {
      existing.items.push(item)
      continue
    }
    byLine.set(key, {
      lineId: item.arrival.lineId ?? "",
      lineName: (item.arrival.lineName ?? item.arrival.lineId) || "Unknown",
      modeName: item.arrival.modeName,
      expectedBounds: [],
      seededEmpty: false,
      items: [item],
      firstSourceIndex: item.sourceIndex,
    })
  }

  for (const [expectedIndex, expected] of expectedLines.entries()) {
    const key = expected.lineId || expected.lineName
    if (!key) continue
    const bounds = resolveExpectedBounds(expected.bounds)
    const existing = byLine.get(key)
    if (existing) {
      if (bounds.length > 0) existing.expectedBounds = bounds
      continue
    }
    byLine.set(key, {
      lineId: expected.lineId,
      lineName: expected.lineName,
      modeName: expected.modeName,
      expectedBounds: bounds,
      seededEmpty: true,
      items: [],
      firstSourceIndex: indexed.length + expectedIndex,
    })
  }

  return [...byLine.values()]
}

const boundLabelOf = (platformName?: string): string | null => {
  const boundId = parseCompassBoundId(platformName)
  if (boundId) return formatArrivalsBoundLabel(boundId)
  return parseArrivalsPlatformLabel(platformName)
}

const collectRailBounds = (
  items: readonly IndexedArrival[],
  expectedBounds: readonly ArrivalsBoundId[],
  sortBy: RailArrivalsSortBy,
  boundSortBy: RailArrivalsBoundSortBy
): ArrivalsPreparedBound[] => {
  const byBound = new Map<
    string | null,
    {
      boundId: ArrivalsBoundId | null
      items: IndexedArrival[]
      firstSourceIndex: number
    }
  >()

  for (const item of items) {
    const boundId = parseCompassBoundId(item.arrival.platformName)
    const label = boundLabelOf(item.arrival.platformName)
    const existing = byBound.get(label)
    if (existing) {
      existing.items.push(item)
      continue
    }
    byBound.set(label, {
      boundId,
      items: [item],
      firstSourceIndex: item.sourceIndex,
    })
  }

  for (const [boundIndex, boundId] of expectedBounds.entries()) {
    const label = formatArrivalsBoundLabel(boundId)
    if (byBound.has(label)) continue
    byBound.set(label, {
      boundId,
      items: [],
      firstSourceIndex: items.length + boundIndex,
    })
  }

  if (byBound.size === 0) {
    return [
      {
        key: "bound-none",
        label: null,
        seededEmpty: true,
        rows: [],
      },
    ]
  }

  const sorted = [...byBound.entries()].sort((a, b) => {
    if (boundSortBy === "source") {
      return a[1].firstSourceIndex - b[1].firstSourceIndex
    }
    return compareArrivalsBounds(a[0], b[0])
  })

  return sorted.map(([label, bucket]) => ({
    key: label ? `bound-${label}` : "bound-none",
    label,
    seededEmpty: bucket.items.length === 0,
    rows: sortIndexed(bucket.items, sortBy).map(toRow),
  }))
}

export type PrepareRailArrivalsOptions = {
  data?: readonly RealtimePrediction[]
  lines?: readonly RailArrivalsLine[]
  sortBy?: RailArrivalsSortBy
  lineSortBy?: RailArrivalsLineSortBy
  boundSortBy?: RailArrivalsBoundSortBy
  /**
   * Explicit line section order. Listed lines rank by list position; unlisted
   * lines follow, canonical among themselves. Ordering only — does not seed
   * or hide lines. When set, overrides `lineSortBy`.
   */
  lineOrder?: readonly string[]
  /** Per-bound prediction cap. Does not drop later lines. Default 16. */
  maxRows?: number
}

const lineOrderRank = (
  lineId: string,
  order: ReadonlyMap<string, number>,
): number | undefined => order.get(normalizeLineId(lineId))

export const prepareRailArrivals = ({
  data,
  lines = [],
  sortBy = "timeToStation",
  lineSortBy = "canonical",
  boundSortBy = "compass",
  lineOrder,
  maxRows = DEFAULT_MAX_ROWS,
}: PrepareRailArrivalsOptions): ArrivalsPreparedBoard => {
  const indexed = indexArrivals(data)
  const buckets = collectRailLines(indexed, lines)

  const explicitOrder =
    lineOrder && lineOrder.length > 0
      ? new Map(
          lineOrder.map((id, index) => [normalizeLineId(id), index] as const),
        )
      : null

  buckets.sort((a, b) => {
    if (explicitOrder) {
      const aRank = lineOrderRank(a.lineId, explicitOrder)
      const bRank = lineOrderRank(b.lineId, explicitOrder)
      if (aRank !== undefined && bRank !== undefined) return aRank - bRank
      if (aRank !== undefined) return -1
      if (bRank !== undefined) return 1
      return compareArrivalsLines(
        { lineId: a.lineId, lineName: a.lineName },
        { lineId: b.lineId, lineName: b.lineName },
      )
    }
    if (lineSortBy === "source") {
      return a.firstSourceIndex - b.firstSourceIndex
    }
    return compareArrivalsLines(
      { lineId: a.lineId, lineName: a.lineName },
      { lineId: b.lineId, lineName: b.lineName }
    )
  })

  const groups: ArrivalsPreparedGroup[] = buckets.map((bucket) => {
    const bounds = collectRailBounds(
      bucket.items,
      bucket.expectedBounds,
      sortBy,
      boundSortBy
    )
    const hasInformation = bounds.some((bound) => bound.rows.length > 0)
    return {
      key: bucket.lineId || bucket.lineName,
      lineId: bucket.lineId,
      lineName: bucket.lineName,
      modeName: bucket.modeName,
      kind: "rail-line",
      hasInformation,
      seededEmpty: bucket.seededEmpty,
      bounds,
    }
  })

  const limited = limitRowsPerBound(groups, maxRows)
  return {
    layout: "grouped",
    groups: limited,
    rows: flattenGroups(limited),
  }
}

const collectBusRoutes = (indexed: readonly IndexedArrival[]): LineBucket[] => {
  const byRoute = new Map<string, LineBucket>()

  for (const item of indexed) {
    const key = lineKeyOf(item.arrival)
    const existing = byRoute.get(key)
    if (existing) {
      existing.items.push(item)
      continue
    }
    byRoute.set(key, {
      lineId: item.arrival.lineId ?? "",
      lineName: (item.arrival.lineName ?? item.arrival.lineId) || "Unknown",
      modeName: item.arrival.modeName,
      expectedBounds: [],
      seededEmpty: false,
      items: [item],
      firstSourceIndex: item.sourceIndex,
    })
  }

  return [...byRoute.values()]
}

export type PrepareBusArrivalsOptions = {
  data?: readonly RealtimePrediction[]
  groupBy?: BusArrivalsGroupBy
  sortBy?: BusArrivalsSortBy
  groupSortBy?: BusArrivalsGroupSortBy
  maxRows?: number
}

export const prepareBusArrivals = ({
  data,
  groupBy = "none",
  sortBy = "timeToStation",
  groupSortBy = "route",
  maxRows = DEFAULT_MAX_ROWS,
}: PrepareBusArrivalsOptions): ArrivalsPreparedBoard => {
  const indexed = indexArrivals(data)

  if (groupBy !== "route") {
    const rows = sortIndexed(indexed, sortBy).slice(0, maxRows).map(toRow)
    return { layout: "flat", groups: [], rows }
  }

  const buckets = collectBusRoutes(indexed)
  buckets.sort((a, b) => {
    if (groupSortBy === "source") {
      return a.firstSourceIndex - b.firstSourceIndex
    }
    return compareBusRouteNames(a.lineName, b.lineName)
  })

  const groups: ArrivalsPreparedGroup[] = buckets.map((bucket) => {
    const rows = sortIndexed(bucket.items, sortBy).map(toRow)
    return {
      key: bucket.lineId || bucket.lineName,
      lineId: bucket.lineId,
      lineName: bucket.lineName,
      modeName: bucket.modeName,
      kind: "bus-route",
      hasInformation: rows.length > 0,
      seededEmpty: false,
      bounds: [
        {
          key: "bound-none",
          label: null,
          seededEmpty: rows.length === 0,
          rows,
        },
      ],
    }
  })

  const limited = limitRowsPerBound(groups, maxRows)
  return {
    layout: "grouped",
    groups: limited,
    rows: flattenGroups(limited),
  }
}
