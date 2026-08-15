import { normalizeLineId, type RealtimePrediction } from "tfl-ts"
import { DEFAULT_MAX_ROWS } from "@/lib/tfl/arrivals-defaults"
import {
  compareArrivalsBounds,
  formatArrivalsBoundLabel,
  formatBoundHeading,
  normalizeArrivalsBoundId,
  parseArrivalsPlatformLabel,
  parseCompassBoundId,
  type ArrivalsBoundId,
} from "@/lib/tfl/arrivals-bound-sort"
import { compareArrivalsLines } from "@/lib/tfl/arrivals-line-sort"
import { compareBusRouteNames } from "@/lib/tfl/arrivals-route-sort"
import { getLineNameTiers, joinLineNames } from "@/lib/tfl/line-names"

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

export type ArrivalsBoundKind = "compass" | "platform" | "unknown" | "none"

export type ArrivalsPreparedBound = {
  key: string
  /** Display heading from `formatBoundHeading`. Null only when kind is `none`. */
  label: string | null
  kind: ArrivalsBoundKind
  boundId: ArrivalsBoundId | null
  /** Cleaned platform letter/number hoisted into the heading, when uniform. */
  platformLabel: string | null
  /**
   * True when every row in this bound shares one known platform — hoist it
   * into the heading and omit the per-row chip.
   */
  platformUniform: boolean
  /** True when this bound was empty before maxRows (metadata seed). */
  seededEmpty: boolean
  rows: ArrivalsPreparedRow[]
}

export type ArrivalsPreparedGroup = {
  key: string
  /** Primary line id (canonical-first member when merged). */
  lineId: string
  /** One id, or every member of a `lineGroups` merge. */
  lineIds: readonly string[]
  lineName: string
  modeName?: string
  kind: "rail-line" | "bus-route"
  hasInformation: boolean
  /** True when the group had no predictions before maxRows. */
  seededEmpty: boolean
  bounds: ArrivalsPreparedBound[]
}

/**
 * Merge several line ids into one board section (shared platforms).
 * Off by default — the caller opts in. Groups with fewer than two ids are ignored.
 */
export type RailArrivalsLineGroup = {
  lines: readonly string[]
  /** Override the joined header. Default: TfL list grammar via `joinLineNames`. */
  label?: string
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
  lineIds: string[]
  lineName: string
  modeName?: string
  expectedBounds: ArrivalsBoundId[]
  seededEmpty: boolean
  items: IndexedArrival[]
  firstSourceIndex: number
}

const EMPTY_BOUND = (): ArrivalsPreparedBound => ({
  key: "bound-none",
  label: null,
  kind: "none",
  boundId: null,
  platformLabel: null,
  platformUniform: false,
  seededEmpty: true,
  rows: [],
})

const orderLineIds = (ids: readonly string[]): string[] =>
  [...ids].sort((a, b) =>
    compareArrivalsLines(
      { lineId: a, lineName: a },
      { lineId: b, lineName: b },
    ),
  )

type ResolvedLineGroup = {
  lines: string[]
  label?: string
}

const resolveLineGroups = (
  lineGroups: readonly RailArrivalsLineGroup[] | undefined,
): Map<string, ResolvedLineGroup> => {
  const membership = new Map<string, ResolvedLineGroup>()
  for (const raw of lineGroups ?? []) {
    const lines = orderLineIds([
      ...new Set(
        raw.lines.map((id) => normalizeLineId(id)).filter(Boolean),
      ),
    ])
    if (lines.length < 2) continue
    if (lines.some((id) => membership.has(id))) continue
    const entry: ResolvedLineGroup = { lines, label: raw.label }
    for (const id of lines) membership.set(id, entry)
  }
  return membership
}

const groupBucketKey = (lineId: string, membership: Map<string, ResolvedLineGroup>) => {
  const group = membership.get(normalizeLineId(lineId))
  if (!group) return lineId
  return `group:${group.lines.join("+")}`
}

const collectRailLines = (
  indexed: readonly IndexedArrival[],
  expectedLines: readonly RailArrivalsLine[],
  lineGroups?: readonly RailArrivalsLineGroup[],
): LineBucket[] => {
  const membership = resolveLineGroups(lineGroups)
  const byLine = new Map<string, LineBucket>()

  const ensureBucket = (
    key: string,
    init: Omit<LineBucket, "items" | "seededEmpty"> & {
      items?: IndexedArrival[]
      seededEmpty?: boolean
    },
  ): LineBucket => {
    const existing = byLine.get(key)
    if (existing) return existing
    const bucket: LineBucket = {
      lineId: init.lineId,
      lineIds: init.lineIds,
      lineName: init.lineName,
      modeName: init.modeName,
      expectedBounds: init.expectedBounds,
      seededEmpty: init.seededEmpty ?? false,
      items: init.items ?? [],
      firstSourceIndex: init.firstSourceIndex,
    }
    byLine.set(key, bucket)
    return bucket
  }

  for (const item of indexed) {
    const rawId = lineKeyOf(item.arrival)
    const lineId = normalizeLineId(item.arrival.lineId || rawId) || rawId
    const key = groupBucketKey(lineId, membership)
    const group = membership.get(normalizeLineId(lineId))
    const existing = byLine.get(key)
    if (existing) {
      existing.items.push(item)
      existing.seededEmpty = false
      existing.firstSourceIndex = Math.min(
        existing.firstSourceIndex,
        item.sourceIndex,
      )
      continue
    }
    const lineIds = group?.lines ?? [lineId]
    const names = lineIds.map((id) => getLineNameTiers(id).full)
    ensureBucket(key, {
      lineId: lineIds[0] ?? lineId,
      lineIds,
      lineName:
        group?.label?.trim() ||
        (lineIds.length > 1
          ? joinLineNames(names)
          : (item.arrival.lineName ?? item.arrival.lineId) || "Unknown"),
      modeName: item.arrival.modeName,
      expectedBounds: [],
      firstSourceIndex: item.sourceIndex,
      items: [item],
    })
  }

  for (const [expectedIndex, expected] of expectedLines.entries()) {
    const expectedId = expected.lineId || expected.lineName
    if (!expectedId) continue
    const lineId = normalizeLineId(expected.lineId) || expectedId
    const key = groupBucketKey(lineId, membership)
    const group = membership.get(normalizeLineId(lineId))
    const bounds = resolveExpectedBounds(expected.bounds)
    const existing = byLine.get(key)
    if (existing) {
      if (bounds.length > 0) {
        const seen = new Set(existing.expectedBounds)
        for (const bound of bounds) {
          if (seen.has(bound)) continue
          seen.add(bound)
          existing.expectedBounds.push(bound)
        }
      }
      continue
    }
    const lineIds = group?.lines ?? [lineId]
    const names = lineIds.map((id) => getLineNameTiers(id, expected.lineName).full)
    ensureBucket(key, {
      lineId: lineIds[0] ?? lineId,
      lineIds,
      lineName:
        group?.label?.trim() ||
        (lineIds.length > 1 ? joinLineNames(names) : expected.lineName),
      modeName: expected.modeName,
      expectedBounds: bounds,
      seededEmpty: true,
      items: [],
      firstSourceIndex: indexed.length + expectedIndex,
    })
  }

  return [...byLine.values()]
}

type BoundKind = ArrivalsBoundKind

type BoundBucket = {
  kind: BoundKind
  boundId: ArrivalsBoundId | null
  platformLabels: Set<string>
  items: IndexedArrival[]
  firstSourceIndex: number
}

const classifyArrivalBound = (
  platformName?: string,
): {
  kind: Exclude<BoundKind, "none">
  boundId: ArrivalsBoundId | null
  platformLabel: string | null
} => {
  const boundId = parseCompassBoundId(platformName)
  const platformLabel = parseArrivalsPlatformLabel(platformName)
  if (boundId) return { kind: "compass", boundId, platformLabel }
  if (platformLabel) return { kind: "platform", boundId: null, platformLabel }
  return { kind: "unknown", boundId: null, platformLabel: null }
}

const boundBucketKey = (
  kind: BoundKind,
  boundId: ArrivalsBoundId | null,
  platformLabel: string | null,
): string => {
  if (kind === "compass" && boundId) return `compass:${boundId}`
  if (kind === "platform" && platformLabel) return `platform:${platformLabel}`
  if (kind === "unknown") return "unknown"
  return "none"
}

const collectRailBounds = (
  items: readonly IndexedArrival[],
  expectedBounds: readonly ArrivalsBoundId[],
  sortBy: RailArrivalsSortBy,
  boundSortBy: RailArrivalsBoundSortBy
): ArrivalsPreparedBound[] => {
  const byBound = new Map<string, BoundBucket>()

  const ensure = (
    key: string,
    kind: BoundKind,
    boundId: ArrivalsBoundId | null,
    sourceIndex: number,
  ): BoundBucket => {
    const existing = byBound.get(key)
    if (existing) return existing
    const bucket: BoundBucket = {
      kind,
      boundId,
      platformLabels: new Set(),
      items: [],
      firstSourceIndex: sourceIndex,
    }
    byBound.set(key, bucket)
    return bucket
  }

  for (const item of items) {
    const classified = classifyArrivalBound(item.arrival.platformName)
    const key = boundBucketKey(
      classified.kind,
      classified.boundId,
      classified.platformLabel,
    )
    const bucket = ensure(
      key,
      classified.kind,
      classified.boundId,
      item.sourceIndex,
    )
    bucket.items.push(item)
    if (classified.platformLabel) {
      bucket.platformLabels.add(classified.platformLabel)
    }
  }

  for (const [boundIndex, boundId] of expectedBounds.entries()) {
    const key = boundBucketKey("compass", boundId, null)
    if (byBound.has(key)) continue
    ensure(key, "compass", boundId, items.length + boundIndex)
  }

  if (byBound.size === 0) {
    return [EMPTY_BOUND()]
  }

  const sorted = [...byBound.entries()].sort((a, b) => {
    if (boundSortBy === "source") {
      return a[1].firstSourceIndex - b[1].firstSourceIndex
    }
    const aUnknown = a[1].kind === "unknown"
    const bUnknown = b[1].kind === "unknown"
    if (aUnknown !== bUnknown) return aUnknown ? 1 : -1
    const aSort =
      a[1].boundId ? formatArrivalsBoundLabel(a[1].boundId) : a[0]
    const bSort =
      b[1].boundId ? formatArrivalsBoundLabel(b[1].boundId) : b[0]
    return compareArrivalsBounds(
      a[1].kind === "compass" ? aSort : a[1].kind === "unknown" ? null : aSort,
      b[1].kind === "compass" ? bSort : b[1].kind === "unknown" ? null : bSort,
    )
  })

  return sorted.map(([key, bucket]) => {
    const uniquePlatforms = [...bucket.platformLabels]
    const platformUniform = uniquePlatforms.length === 1
    const platformLabel = platformUniform ? uniquePlatforms[0]! : null
    const hoistPlatform =
      bucket.kind === "platform" || (bucket.kind === "compass" && platformUniform)
    const label = formatBoundHeading({
      boundId: bucket.boundId,
      platformLabel: hoistPlatform ? platformLabel : null,
      unknown: bucket.kind === "unknown",
    })
    return {
      key: `bound-${key}`,
      label,
      kind: bucket.kind,
      boundId: bucket.boundId,
      platformLabel: hoistPlatform ? platformLabel : null,
      platformUniform: hoistPlatform && platformLabel !== null,
      seededEmpty: bucket.items.length === 0,
      rows: sortIndexed(bucket.items, sortBy).map(toRow),
    }
  })
}

export type PrepareRailArrivalsOptions = {
  data?: readonly RealtimePrediction[]
  lines?: readonly RailArrivalsLine[]
  /**
   * Merge listed line ids into one section. Off by default. Groups with
   * fewer than two ids, or that collide with an earlier group, are ignored.
   */
  lineGroups?: readonly RailArrivalsLineGroup[]
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
  lineIds: readonly string[],
  order: ReadonlyMap<string, number>,
): number | undefined => {
  let best: number | undefined
  for (const lineId of lineIds) {
    const rank = order.get(normalizeLineId(lineId))
    if (rank === undefined) continue
    if (best === undefined || rank < best) best = rank
  }
  return best
}

export const prepareRailArrivals = ({
  data,
  lines = [],
  lineGroups,
  sortBy = "timeToStation",
  lineSortBy = "canonical",
  boundSortBy = "compass",
  lineOrder,
  maxRows = DEFAULT_MAX_ROWS,
}: PrepareRailArrivalsOptions): ArrivalsPreparedBoard => {
  const indexed = indexArrivals(data)
  const buckets = collectRailLines(indexed, lines, lineGroups)

  const explicitOrder =
    lineOrder && lineOrder.length > 0
      ? new Map(
          lineOrder.map((id, index) => [normalizeLineId(id), index] as const),
        )
      : null

  buckets.sort((a, b) => {
    if (explicitOrder) {
      const aRank = lineOrderRank(a.lineIds, explicitOrder)
      const bRank = lineOrderRank(b.lineIds, explicitOrder)
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
      key: bucket.lineIds.length > 1
        ? `group:${bucket.lineIds.join("+")}`
        : bucket.lineId || bucket.lineName,
      lineId: bucket.lineId,
      lineIds: bucket.lineIds,
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
      lineIds: [item.arrival.lineId ?? key],
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
      lineIds: bucket.lineIds,
      lineName: bucket.lineName,
      modeName: bucket.modeName,
      kind: "bus-route",
      hasInformation: rows.length > 0,
      seededEmpty: false,
      bounds: [
        {
          key: "bound-none",
          label: null,
          kind: "none",
          boundId: null,
          platformLabel: null,
          platformUniform: false,
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
