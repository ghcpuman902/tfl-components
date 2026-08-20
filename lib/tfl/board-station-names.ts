/**
 * Offline stop → display-name index for the hosted Board.
 *
 * Built from the same `getStationCatalog()` used by `board-station-lines.ts`,
 * so a Stop ID the Board already recognises for serving lines also resolves
 * a human name — the Config form and `/board/view` never need to show a raw
 * NaPTAN id as the station title.
 */

import { getLineNameTiers } from "@/lib/tfl/line-names"
import {
  getStationCatalog,
  STATION_CATALOG_MODES,
  type CatalogStation,
} from "@/lib/tfl/station-catalog"

export type BoardStationNamesIndex = Readonly<Record<string, string>>

export type BoardStationSearchItem = {
  id: string
  name: string
  /** Modes, plus line names when another station shares this display name. */
  context: string
  aliasIds: readonly string[]
}

const MODE_LABEL: Readonly<Record<string, string>> = Object.fromEntries(
  STATION_CATALOG_MODES.map((mode) => [mode.id, mode.label])
)

const modeLabelsOf = (station: CatalogStation): string[] =>
  station.modes.map((id) => MODE_LABEL[id] ?? id)

const lineLabelsOf = (station: CatalogStation): string[] =>
  station.lines.slice(0, 3).map((id) => getLineNameTiers(id).middle)

const searchContextOf = (
  station: CatalogStation,
  duplicateName: boolean
): string => {
  const parts = modeLabelsOf(station)
  if (duplicateName) parts.push(...lineLabelsOf(station))
  return [...new Set(parts)].join(" · ")
}

/** Compact stop id (+ aliases) → display name map. */
export const buildBoardStationNamesIndex = (): BoardStationNamesIndex => {
  const index: Record<string, string> = {}

  for (const station of getStationCatalog()) {
    index[station.id] = station.displayName
    for (const aliasId of station.aliasIds) {
      if (!index[aliasId]) index[aliasId] = station.displayName
    }
  }

  return index
}

let indexMemo: BoardStationNamesIndex | undefined

/** Memoised for the process lifetime (server pages / SSR). */
export const getBoardStationNamesIndex = (): BoardStationNamesIndex => {
  indexMemo ??= buildBoardStationNamesIndex()
  return indexMemo
}

/** Lookup a stop's display name. Undefined when the stop is not in the index. */
export const lookupBoardStationName = (
  index: BoardStationNamesIndex,
  stopId: string | undefined
): string | undefined => {
  const id = stopId?.trim()
  if (!id) return undefined
  return index[id]
}

export const buildBoardStationSearchIndex = (): BoardStationSearchItem[] => {
  const catalog = getStationCatalog()
  const nameCounts = new Map<string, number>()
  for (const station of catalog) {
    const key = station.displayName.toLowerCase()
    nameCounts.set(key, (nameCounts.get(key) ?? 0) + 1)
  }

  return catalog.map((station) => {
    const duplicateName =
      (nameCounts.get(station.displayName.toLowerCase()) ?? 0) > 1
    return {
      id: station.id,
      name: station.displayName,
      context: searchContextOf(station, duplicateName),
      aliasIds: station.aliasIds,
    }
  })
}

let searchMemo: BoardStationSearchItem[] | undefined

export const getBoardStationSearchIndex = (): BoardStationSearchItem[] => {
  searchMemo ??= buildBoardStationSearchIndex()
  return searchMemo
}

export const matchBoardStationSearchItem = (
  items: readonly BoardStationSearchItem[],
  stopId: string | undefined
): BoardStationSearchItem | undefined => {
  const id = stopId?.trim()
  if (!id) return undefined
  return items.find((item) => item.id === id || item.aliasIds.includes(id))
}

export type BoardStationPick = {
  id: string
  name?: string
}

const pickFromRecord = (
  value: Record<string, unknown>
): BoardStationPick | undefined => {
  const id = typeof value.id === "string" ? value.id.trim() : ""
  if (!id) return undefined
  const name = typeof value.name === "string" ? value.name.trim() : ""
  return name ? { id, name } : { id }
}

/**
 * Visible station-input text. Always a human name or the typed query —
 * never a serialised object.
 */
export const displayBoardStationValue = (
  selected: BoardStationSearchItem | undefined,
  query: string
): string => {
  if (selected) return selected.name
  const trimmed = query.trim()
  if (trimmed.startsWith("{")) {
    const pick = parseBoardStationPick(trimmed)
    if (pick?.name) return pick.name
    return ""
  }
  return query
}

/** TfL Stop IDs are alphanumeric (often NaPTAN) and usually include a digit. */
export const looksLikeBoardStopId = (query: string): boolean => {
  const trimmed = query.trim()
  if (!trimmed || trimmed.length < 6) return false
  if (trimmed.startsWith("{")) return true
  if (!/^[A-Za-z0-9_-]+$/.test(trimmed)) return false
  return /\d/.test(trimmed)
}

export type BoardStationResolve =
  | { status: "match"; item: BoardStationSearchItem }
  | { status: "unknown-id"; query: string }
  | { status: "none" }

/**
 * Resolve a typed name, pasted Stop ID, alias, or JSON pick to a catalogue
 * station. Name matches stay in autocomplete — only exact IDs resolve here.
 */
export const resolveBoardStationQuery = (
  items: readonly BoardStationSearchItem[],
  query: string
): BoardStationResolve => {
  const trimmed = query.trim()
  if (!trimmed) return { status: "none" }

  if (trimmed.startsWith("{")) {
    const pick = parseBoardStationPick(trimmed)
    if (pick) {
      const item = matchBoardStationSearchItem(items, pick.id)
      if (item) return { status: "match", item }
      return { status: "unknown-id", query: pick.id }
    }
  }

  const exact = matchBoardStationSearchItem(items, trimmed)
  if (exact) return { status: "match", item: exact }

  if (looksLikeBoardStopId(trimmed)) {
    return { status: "unknown-id", query: trimmed }
  }

  return { status: "none" }
}

/**
 * Combobox pick → Stop ID. Accepts a search item, a NaPTAN id, or the JSON
 * object Base UI serialises when `itemToStringLabel` is missing.
 */
export const parseBoardStationPick = (
  value: unknown
): BoardStationPick | undefined => {
  if (value == null) return undefined

  if (typeof value === "object" && !Array.isArray(value)) {
    return pickFromRecord(value as Record<string, unknown>)
  }

  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined

  if (trimmed.startsWith("{")) {
    try {
      return parseBoardStationPick(JSON.parse(trimmed) as unknown)
    } catch {
      return undefined
    }
  }

  return { id: trimmed }
}

/**
 * URL / config override only. Empty, or a value that matches the catalog
 * name for this stop, is not an override — the board resolves the heading.
 */
export const resolveBoardStopNameOverride = (
  typed: string | undefined,
  autoName: string | undefined
): string | undefined => {
  const name = typed?.trim()
  if (!name) return undefined
  if (autoName && name === autoName) return undefined
  return name
}
