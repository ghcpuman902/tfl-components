import {
  normalizeLineId,
  type PredictionWithSharedTrackIdentity,
  type RealtimePrediction,
} from "tfl-ts"
import { DEFAULT_MAX_ROWS } from "@/lib/tfl/arrivals-defaults"
import {
  compareArrivalsBounds,
  formatArrivalsBoundLabel,
  formatBoundHeading,
  normalizeArrivalsBoundId,
  parseArrivalsPlatformLabel,
  parseArrivalsRailDesignation,
  parseCompassBoundId,
  type ArrivalsBoundId,
  type ArrivalsRailDesignation,
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
  /** Inner/Outer Rail qualifier, when the platform carries one (Paddington/Bayswater/Notting Hill Gate Circle/H&C). */
  railDesignation: ArrivalsRailDesignation | null
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

/**
 * TfL's own field: "the expiry time for the prediction". Confirmed live on
 * Weaver at Liverpool Street and Elizabeth line at Paddington — a
 * "self-destination" row (destination equals the station you're standing
 * at, no direction) reports `timeToLive` a fixed ~1 minute in the past while
 * `timeToStation` keeps counting up for up to two hours. TfL is telling the
 * client this record already expired; `timeToStation` is a stale leftover.
 * Underground rows never trip this — their `timeToLive` always tracks
 * `expectedArrival` exactly, so it's never "expired" before the train has
 * actually arrived. See docs/arrivals-shared-platforms.md.
 */
export const isExpiredArrivalPrediction = (
  arrival: RealtimePrediction,
  now: number
): boolean => {
  const timeToLive = arrival.timeToLive
  if (!timeToLive) return false
  const expiry = Date.parse(timeToLive)
  return Number.isFinite(expiry) && expiry < now
}

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

export const arrivalCanonicalLineId = (
  arrival: RealtimePrediction,
): string => {
  const tagged = arrival as PredictionWithSharedTrackIdentity
  const identity = tagged.sharedTrackIdentity
  const canonicalLineId =
    identity?.confidence === "exclusive-segment"
      ? identity.canonicalLineId
      : undefined
  return canonicalLineId || arrival.lineId || arrival.lineName || "unknown"
}

const lineKeyOf = (arrival: RealtimePrediction): string =>
  arrivalCanonicalLineId(arrival)

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

export type ArrivalsPageFill = {
  rows: ArrivalsPreparedRow[]
  /** Quiet dash tiles between the last arrival (or empty row) and the end message. */
  dashCount: number
  /** Final spare tile on a short page that still has arrivals. */
  showEndMessage: boolean
}

export type ArrivalsLockHeight = boolean | "when-paged"

const resolvePageFill = (
  visibleCount: number,
  pageSize: number,
  lockHeight: boolean
): Pick<ArrivalsPageFill, "dashCount" | "showEndMessage"> => {
  if (!lockHeight || pageSize <= 0) {
    return { dashCount: 0, showEndMessage: false }
  }
  if (visibleCount === 0) {
    return { dashCount: Math.max(0, pageSize - 1), showEndMessage: false }
  }
  const spare = pageSize - visibleCount
  if (spare <= 0) {
    return { dashCount: 0, showEndMessage: false }
  }
  return { dashCount: spare - 1, showEndMessage: true }
}

const resolvePageCount = (
  rowCount: number,
  pageSize: number
): number => {
  if (pageSize <= 0) return 1
  return Math.max(1, Math.ceil(rowCount / pageSize))
}

const shouldLockHeight = (
  lockHeight: ArrivalsLockHeight | undefined,
  pageCount: number
): boolean => {
  if (lockHeight === "when-paged") return pageCount > 1
  return Boolean(lockHeight)
}

/** Visible slice for bound-group pagination. `pageSize <= 0` shows every row. */
export const sliceBoundPage = (
  rows: readonly ArrivalsPreparedRow[],
  page: number,
  pageSize: number,
  lockHeight: ArrivalsLockHeight = false
): {
  rows: ArrivalsPreparedRow[]
  page: number
  pageCount: number
  dashCount: number
  showEndMessage: boolean
} => {
  const pageCount = resolvePageCount(rows.length, pageSize)
  const locked = shouldLockHeight(lockHeight, pageCount) && pageSize > 0
  if (pageSize <= 0) {
    return {
      rows: [...rows],
      page: 0,
      pageCount: 1,
      dashCount: 0,
      showEndMessage: false,
    }
  }
  const safePage = Math.min(Math.max(0, page), pageCount - 1)
  const start = safePage * pageSize
  const visible = rows.slice(start, start + pageSize)
  return {
    rows: visible,
    page: safePage,
    pageCount,
    ...resolvePageFill(visible.length, pageSize, locked),
  }
}

/** Every page for a scroll-snap track. Reuses `sliceBoundPage` per index. */
export const chunkBoundPages = (
  rows: readonly ArrivalsPreparedRow[],
  pageSize: number,
  options?: { lockHeight?: ArrivalsLockHeight }
): {
  pages: ArrivalsPageFill[]
  pageCount: number
} => {
  const { pageCount } = sliceBoundPage(rows, 0, pageSize, options?.lockHeight)
  return {
    pageCount,
    pages: Array.from({ length: pageCount }, (_, index) => {
      const { rows: pageRows, dashCount, showEndMessage } = sliceBoundPage(
        rows,
        index,
        pageSize,
        options?.lockHeight
      )
      return { rows: pageRows, dashCount, showEndMessage }
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
  railDesignation: null,
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

const sharedTrackIdentityRank = (arrival: RealtimePrediction): number => {
  const tagged = arrival as PredictionWithSharedTrackIdentity
  const identity = tagged.sharedTrackIdentity
  if (identity?.confidence === "exclusive-segment") return 0
  if (identity?.confidence === "ambiguous" && identity.rawLineIds.length >= 2) {
    return 1
  }
  return 2
}

/**
 * TfL omits a real train id as blank or all zeros (`"000"`). Those are not
 * one vehicle — collapsing them deletes distinct arrivals.
 */
const isUsableVehicleId = (
  vehicleId: string | undefined,
): vehicleId is string => {
  const trimmed = vehicleId?.trim()
  if (!trimmed) return false
  return !/^0+$/.test(trimmed)
}

/**
 * TfL dual-lists the same vehicle on two lineIds at one shared-track stop.
 * Keep one row per usable `vehicleId` so the board does not paint the same
 * train twice. Placeholder ids stay as separate rows.
 */
const dedupeSharedTrackVehicles = (
  items: readonly IndexedArrival[],
): IndexedArrival[] => {
  const byVehicle = new Map<string, IndexedArrival[]>()
  const passthrough: IndexedArrival[] = []
  for (const item of items) {
    const vehicleId = item.arrival.vehicleId?.trim()
    if (!isUsableVehicleId(vehicleId)) {
      passthrough.push(item)
      continue
    }
    const rows = byVehicle.get(vehicleId)
    if (rows) rows.push(item)
    else byVehicle.set(vehicleId, [item])
  }

  const picked: IndexedArrival[] = []
  for (const rows of byVehicle.values()) {
    if (rows.length === 1) {
      picked.push(rows[0]!)
      continue
    }
    picked.push(
      [...rows].sort((a, b) => {
        const rankDiff =
          sharedTrackIdentityRank(a.arrival) -
          sharedTrackIdentityRank(b.arrival)
        if (rankDiff !== 0) return rankDiff
        const timeDiff =
          (a.arrival.timeToStation ?? 0) - (b.arrival.timeToStation ?? 0)
        if (timeDiff !== 0) return timeDiff
        return a.sourceIndex - b.sourceIndex
      })[0]!,
    )
  }

  return [...passthrough, ...picked].sort(
    (a, b) => a.sourceIndex - b.sourceIndex,
  )
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
    const lineId = normalizeLineId(rawId) || rawId
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
          : getLineNameTiers(lineId, item.arrival.lineName).full || "Unknown"),
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

  for (const bucket of byLine.values()) {
    if (bucket.items.length > 1) {
      bucket.items = dedupeSharedTrackVehicles(bucket.items)
    }
  }

  return [...byLine.values()]
}

type BoundKind = ArrivalsBoundKind

type BoundBucket = {
  kind: BoundKind
  boundId: ArrivalsBoundId | null
  railDesignation: ArrivalsRailDesignation | null
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
  railDesignation: ArrivalsRailDesignation | null
} => {
  const boundId = parseCompassBoundId(platformName)
  const platformLabel = parseArrivalsPlatformLabel(platformName)
  const railDesignation = boundId
    ? null
    : parseArrivalsRailDesignation(platformName)
  if (boundId) {
    return { kind: "compass", boundId, platformLabel, railDesignation: null }
  }
  if (platformLabel) {
    return { kind: "platform", boundId: null, platformLabel, railDesignation }
  }
  return { kind: "unknown", boundId: null, platformLabel: null, railDesignation: null }
}

const boundBucketKey = (
  kind: BoundKind,
  boundId: ArrivalsBoundId | null,
  platformLabel: string | null,
  railDesignation: ArrivalsRailDesignation | null,
): string => {
  if (kind === "compass" && boundId) return `compass:${boundId}`
  if (kind === "platform" && platformLabel) {
    return railDesignation
      ? `platform:${railDesignation}:${platformLabel}`
      : `platform:${platformLabel}`
  }
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
    railDesignation: ArrivalsRailDesignation | null,
    sourceIndex: number,
  ): BoundBucket => {
    const existing = byBound.get(key)
    if (existing) return existing
    const bucket: BoundBucket = {
      kind,
      boundId,
      railDesignation,
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
      classified.railDesignation,
    )
    const bucket = ensure(
      key,
      classified.kind,
      classified.boundId,
      classified.railDesignation,
      item.sourceIndex,
    )
    bucket.items.push(item)
    if (classified.platformLabel) {
      bucket.platformLabels.add(classified.platformLabel)
    }
  }

  for (const [boundIndex, boundId] of expectedBounds.entries()) {
    const key = boundBucketKey("compass", boundId, null, null)
    if (byBound.has(key)) continue
    ensure(key, "compass", boundId, null, items.length + boundIndex)
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
      railDesignation: bucket.railDesignation,
      unknown: bucket.kind === "unknown",
    })
    return {
      key: `bound-${key}`,
      label,
      kind: bucket.kind,
      boundId: bucket.boundId,
      platformLabel: hoistPlatform ? platformLabel : null,
      railDesignation: bucket.railDesignation,
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
  /**
   * Current time (ms) — drops any prediction whose `timeToLive` has already
   * expired (see `isExpiredArrivalPrediction`). Omit to skip this filter,
   * e.g. static demos with no live "now". Live callers should pass
   * `Date.now()` captured alongside `data` at fetch time, not a default
   * evaluated wherever this runs — see
   * `.cursor/rules/nextjs-cache-components-time.mdc`.
   */
  now?: number
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
  now,
  maxRows = DEFAULT_MAX_ROWS,
}: PrepareRailArrivalsOptions): ArrivalsPreparedBoard => {
  const indexed = indexArrivals(data).filter(
    (item) => now === undefined || !isExpiredArrivalPrediction(item.arrival, now)
  )
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
  /**
   * Current time (ms) — drops predictions whose `timeToLive` has already
   * expired. Same rail "self-destination" trap in principle (see
   * `isExpiredArrivalPrediction`); pass `Date.now()` captured alongside
   * `data` at fetch time. Omit to skip this filter.
   */
  now?: number
  maxRows?: number
}

export const prepareBusArrivals = ({
  data,
  groupBy = "none",
  sortBy = "timeToStation",
  groupSortBy = "route",
  now,
  maxRows = DEFAULT_MAX_ROWS,
}: PrepareBusArrivalsOptions): ArrivalsPreparedBoard => {
  const indexed = indexArrivals(data).filter(
    (item) => now === undefined || !isExpiredArrivalPrediction(item.arrival, now)
  )

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
          railDesignation: null,
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
