/**
 * Offline Explorer search over a complete local point catalogue.
 * Name matches outrank ids, then serving lines, then modes. Typing is search.
 */

import type { ExplorerPoint } from "@/lib/tfl/explorer-point-normalise"
import { distanceMeters, isValidLatLon } from "@/lib/tfl/geo"
import { getLineNameTiers } from "@/lib/tfl/line-names"
import { STATION_CATALOG_MODES } from "@/lib/tfl/station-catalog"

export const EXPLORER_LOCATE_RADIUS_METERS = 800
export const EXPLORER_LOCATE_LIMIT = 25

const RANK_NAME_EXACT = 0
const RANK_NAME_PREFIX = 1
const RANK_NAME_CONTAINS = 2
const RANK_ID = 3
const RANK_LINE = 4
const RANK_MODE = 5
const RANK_NONE = 9

const DIACRITICS = /\p{M}/gu
const NON_ALNUM = /[^a-z0-9]+/g
const NAME_COMPARE = { sensitivity: "base" } as const

const fold = (value: string): string =>
  value
    .normalize("NFKD")
    .replace(DIACRITICS, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[''`´]/g, "")
    .replace(NON_ALNUM, " ")
    .trim()
    .replace(/\s+/g, " ")

const MODE_NEEDLES: ReadonlyMap<string, readonly string[]> = new Map([
  ...STATION_CATALOG_MODES.map(
    (mode) =>
      [mode.id, [fold(mode.id), fold(mode.label)].filter(Boolean)] as const
  ),
  [
    "river-bus",
    [fold("river-bus"), fold("river"), fold("river bus"), fold("ferry")],
  ],
])

const lineNeedlesCache = new Map<string, readonly string[]>()

const tokensOf = (folded: string): readonly string[] =>
  folded.length === 0 ? [] : folded.split(" ")

/** Query tokens appear in order as prefixes of haystack tokens. */
const tokensMatch = (
  haystackTokens: readonly string[],
  queryTokens: readonly string[]
): boolean => {
  if (queryTokens.length === 0) return false
  let index = 0
  for (const queryToken of queryTokens) {
    while (
      index < haystackTokens.length &&
      !haystackTokens[index]!.startsWith(queryToken)
    ) {
      index += 1
    }
    if (index >= haystackTokens.length) return false
    index += 1
  }
  return true
}

const foldedMatches = (
  haystack: string,
  query: string,
  queryTokens: readonly string[],
  allowContains: boolean
): boolean => {
  if (!haystack) return false
  if (haystack === query || haystack.startsWith(query)) return true
  if (allowContains && haystack.includes(query)) return true
  return tokensMatch(tokensOf(haystack), queryTokens)
}

const lineNeedles = (lineId: string): readonly string[] => {
  const cached = lineNeedlesCache.get(lineId)
  if (cached) return cached

  const tiers = getLineNameTiers(lineId)
  const unique = new Set<string>()
  for (const value of [lineId, tiers.full, tiers.middle, tiers.short]) {
    const folded = fold(value)
    if (folded) unique.add(folded)
  }
  const needles = [...unique]
  lineNeedlesCache.set(lineId, needles)
  return needles
}

const idHaystacks = (point: ExplorerPoint): string[] => {
  const ids = [point.id]
  if (point.hubId) ids.push(point.hubId)
  if (point.aliasIds) ids.push(...point.aliasIds)
  if (point.hubMembers) {
    for (const member of point.hubMembers) ids.push(member.id)
  }
  return ids
}

const nameRank = (
  foldedName: string,
  query: string,
  queryTokens: readonly string[]
): number => {
  if (!foldedName) return RANK_NONE
  if (foldedName === query) return RANK_NAME_EXACT
  if (foldedName.startsWith(query)) return RANK_NAME_PREFIX
  if (
    foldedName.includes(query) ||
    tokensMatch(tokensOf(foldedName), queryTokens)
  ) {
    return RANK_NAME_CONTAINS
  }
  return RANK_NONE
}

const idRank = (point: ExplorerPoint, rawQuery: string): number => {
  if (!rawQuery) return RANK_NONE
  for (const id of idHaystacks(point)) {
    const haystack = id.toLowerCase()
    if (haystack === rawQuery) return RANK_ID
    if (rawQuery.length >= 3 && haystack.startsWith(rawQuery)) return RANK_ID
    if (rawQuery.length >= 4 && haystack.includes(rawQuery)) return RANK_ID
  }
  return RANK_NONE
}

const lineRank = (
  point: ExplorerPoint,
  query: string,
  queryTokens: readonly string[]
): number => {
  if (query.length < 2) return RANK_NONE
  for (const lineId of point.lineIds ?? []) {
    for (const needle of lineNeedles(lineId)) {
      if (foldedMatches(needle, query, queryTokens, true)) return RANK_LINE
    }
  }
  return RANK_NONE
}

const modeRank = (
  point: ExplorerPoint,
  query: string,
  queryTokens: readonly string[]
): number => {
  if (query.length < 2) return RANK_NONE
  for (const mode of point.modes ?? []) {
    const needles = MODE_NEEDLES.get(mode) ?? [fold(mode)]
    for (const needle of needles) {
      if (foldedMatches(needle, query, queryTokens, true)) return RANK_MODE
    }
  }
  return RANK_NONE
}

const matchRank = (
  point: ExplorerPoint,
  query: string,
  queryTokens: readonly string[],
  rawIdQuery: string
): number =>
  Math.min(
    nameRank(fold(point.name), query, queryTokens),
    idRank(point, rawIdQuery),
    lineRank(point, query, queryTokens),
    modeRank(point, query, queryTokens)
  )

/**
 * Filter a complete local catalogue. Empty / punctuation-only queries
 * return the input order (A–Z). Hits are ranked name → id → line → mode,
 * then A–Z within a rank.
 */
export const filterExplorerPoints = (
  points: readonly ExplorerPoint[],
  query: string
): ExplorerPoint[] => {
  const foldedQuery = fold(query)
  if (!foldedQuery) return [...points]

  const queryTokens = tokensOf(foldedQuery)
  const rawIdQuery = query.trim().toLowerCase()
  const hits: { point: ExplorerPoint; rank: number }[] = []

  for (const point of points) {
    const rank = matchRank(point, foldedQuery, queryTokens, rawIdQuery)
    if (rank === RANK_NONE) continue
    hits.push({ point, rank })
  }

  hits.sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank
    return a.point.name.localeCompare(b.point.name, "en-GB", NAME_COMPARE)
  })

  return hits.map((hit) => hit.point)
}

/**
 * Nearest catalogue points to a geolocation. Points without coordinates
 * are skipped. Does not call TfL.
 */
export const nearbyExplorerPoints = (
  points: readonly ExplorerPoint[],
  origin: { lat: number; lon: number },
  radiusMeters = EXPLORER_LOCATE_RADIUS_METERS,
  limit = EXPLORER_LOCATE_LIMIT
): ExplorerPoint[] => {
  if (!isValidLatLon(origin.lat, origin.lon)) return []

  const ranked: { point: ExplorerPoint; distance: number }[] = []
  for (const point of points) {
    if (typeof point.lat !== "number" || typeof point.lon !== "number") continue
    if (!isValidLatLon(point.lat, point.lon)) continue
    const distance = distanceMeters(
      origin.lat,
      origin.lon,
      point.lat,
      point.lon
    )
    if (distance > radiusMeters) continue
    ranked.push({ point, distance })
  }

  ranked.sort((a, b) => {
    if (a.distance !== b.distance) return a.distance - b.distance
    return a.point.name.localeCompare(b.point.name, "en-GB", NAME_COMPARE)
  })

  return ranked.slice(0, limit).map(({ point, distance }) => ({
    ...point,
    distanceMeters: Math.round(distance),
  }))
}
